import {
	type AstroNode,
	childrenOf,
	hasAttribute,
	hasSetDirective,
	isComponentName,
	tagNameOf,
} from './ast';
import { displayOfTag, isInlineDisplay, rawTextElements } from './elements';
import type { CompressHTML } from './options';

type Sensitivity = 'css' | 'strict' | 'ignore';

export interface Settings {
	mode: CompressHTML;
	sensitivity: Sensitivity;
}

interface Context extends Settings {
	isRoot: boolean;
	inRaw: boolean;
}

type Decision = 'keep' | 'drop' | 'space';

const leadingWhitespace = /^[\t\n\f\r ]+/;
const trailingWhitespace = /[\t\n\f\r ]+$/;
const hasNewline = (run: string) => /[\n\r]/.test(run);

const isText = (node: AstroNode | null) => node?.type === 'JSXText';
const isComment = (node: AstroNode | null) => node?.type === 'AstroComment';
const rawTextOf = (node: AstroNode) => (node.raw as string | undefined) ?? '';
const isWhitespaceOnly = (node: AstroNode) => isText(node) && rawTextOf(node).trim().length === 0;

export function opensRawSubtree(node: AstroNode): boolean {
	if (node.type !== 'JSXElement') return false;
	if (hasAttribute(node, 'is:raw')) return true;
	const tag = tagNameOf(node);
	return tag !== null && !isComponentName(tag) && rawTextElements.has(tag);
}

/** A `<style>` the compiler lifts out of the template, taking the whitespace beside it. */
const isExtractedStyle = (node: AstroNode | null) =>
	node !== null && tagNameOf(node) === 'style' && !hasAttribute(node, 'is:inline');

function displayOf(node: AstroNode): string {
	if (node.type !== 'JSXElement') return 'inline';
	const tag = tagNameOf(node);
	if (tag === null || isComponentName(tag) || tag.includes('-')) return 'inline';
	if (node.astroSvg) return tag === 'svg' ? 'inline-block' : 'block';
	return displayOfTag(tag);
}

const isBlockBox = (node: AstroNode | null): boolean =>
	node !== null && node.type !== 'JSXText' && !isInlineDisplay(displayOf(node));

// An inline-block sits inline but lays its content out separately, so its own edges never render whitespace.
export const swallowsEdgeWhitespace = (node: AstroNode): boolean => {
	const display = displayOf(node);
	return display === 'inline-block' || !isInlineDisplay(display);
};

const breaksOwnChildren = new Set(['html', 'head', 'body', 'ul', 'ol', 'select']);

/** Mirrors prettier's HTML printer: these lay their children out one per line however they were written. */
export function breaksChildren(node: AstroNode): boolean {
	const tag = node.type === 'JSXElement' ? tagNameOf(node) : null;
	if (tag === null || isComponentName(tag)) return false;
	if (breaksOwnChildren.has(tag)) return true;
	const display = displayOfTag(tag);
	return display.startsWith('table') && display !== 'table-cell';
}

const hasElementChild = (node: AstroNode): boolean =>
	childrenOf(node)?.some((child) => child.type === 'JSXElement') ?? false;

const runBefore = (node: AstroNode | undefined) =>
	node && isText(node) ? (trailingWhitespace.exec(rawTextOf(node))?.[0] ?? '') : '';

const runAfter = (node: AstroNode | undefined) =>
	node && isText(node) ? (leadingWhitespace.exec(rawTextOf(node))?.[0] ?? '') : '';

// An element the author gave a line of its own keeps it, however narrow it is. Text always reflows.
export function sitsOnItsOwnLine(container: AstroNode, child: AstroNode | null): boolean {
	if (child === null || isText(child)) return false;
	const children = childrenOf(container);
	const index = children?.indexOf(child) ?? -1;
	if (index === -1) return false;
	return (
		hasNewline(runBefore(children![index - 1])) && hasNewline(runAfter(children![index + 1]))
	);
}

const hasChildOnItsOwnLine = (node: AstroNode): boolean =>
	childrenOf(node)?.some((child) => sitsOnItsOwnLine(node, child)) ?? false;

export function forcesBreak(node: AstroNode): boolean {
	if (breaksChildren(node)) return true;
	const children = childrenOf(node);
	if (children === null) return false;
	return children.some(hasElementChild) || hasChildOnItsOwnLine(node);
}

export type Separator = 'none' | 'soft' | 'space' | 'break' | 'blank';

export interface PrinterBoundary {
	container: AstroNode;
	prev: AstroNode | null;
	next: AstroNode | null;
	isRoot: boolean;
	loneChild: boolean;
	edge: boolean;
}

const isBlankRun = (run: string) => /[\n\r][^\S\n\r]*[\n\r]/.test(run);

/** A text neighbour never decides significance; at a container edge only the container does. */
function sidesFor(boundary: PrinterBoundary): (AstroNode | null)[] | null {
	if (boundary.edge) return [null];
	const sides: (AstroNode | null)[] = [];
	if (boundary.prev === null) sides.push(null);
	else if (boundary.prev.type !== 'JSXText') sides.push(boundary.prev);
	if (boundary.next === null) sides.push(null);
	else if (boundary.next.type !== 'JSXText') sides.push(boundary.next);
	return sides.length > 0 ? sides : null;
}

/** `<slot>` and custom elements get a slot iff they have content, so their blank content is content. */
export function blankContentIsFree(
	container: AstroNode,
	isRoot: boolean,
	settings: Settings,
): boolean {
	const tag = container.type === 'JSXElement' ? tagNameOf(container) : null;
	if (tag === 'slot') return false;
	if (tag !== null && !isComponentName(tag) && tag.includes('-')) return false;

	const boundary: Boundary = {
		container,
		context: { ...settings, isRoot, inRaw: false },
		prev: null,
		next: null,
		sides: [null],
		atStart: true,
		atEnd: true,
		loneChild: true,
	};
	return isFree(boundary) || mayAlterRenderedWhitespace(boundary);
}

export function separatorFor(
	run: string,
	boundary: PrinterBoundary,
	settings: Settings,
): Separator {
	const sides = sidesFor(boundary);
	const internal: Boundary = {
		container: boundary.container,
		context: { ...settings, isRoot: boundary.isRoot, inRaw: false },
		prev: boundary.prev,
		next: boundary.next,
		sides: sides ?? [],
		atStart: boundary.prev === null,
		atEnd: boundary.next === null,
		loneChild: boundary.loneChild,
	};

	if (isSlotFallback(internal)) return run === '' ? 'none' : 'space';
	const free = isFree(internal) || (sides !== null && mayAlterRenderedWhitespace(internal));
	if (boundary.edge) {
		if (free) return 'soft';
		return run === '' ? 'none' : 'space';
	}
	if (isBlankRun(run)) return 'blank';
	// Between inline neighbours a newline and a space render alike, so it is free to reflow.
	if (
		hasNewline(run) &&
		(settings.sensitivity === 'strict' ||
			sitsOnItsOwnLine(boundary.container, boundary.prev) ||
			sitsOnItsOwnLine(boundary.container, boundary.next))
	) {
		return 'break';
	}
	// Whitespace beside a comment is spent on a line break, so the comment reads as its own remark.
	if (run !== '' && (isComment(boundary.prev) || isComment(boundary.next))) return 'break';
	// A block box swallows the whitespace beside it, so prettier's HTML printer spends it on a line of its own.
	if (free) return isBlockBox(boundary.prev) || isBlockBox(boundary.next) ? 'break' : 'soft';
	return run === '' ? 'none' : 'space';
}

export function normalizeWhitespace(template: AstroNode, options: Settings): void {
	visit(template, { ...options, isRoot: true, inRaw: false });
}

function visit(container: AstroNode, context: Context): void {
	const children = childrenOf(container);
	if (children === null) return;

	if (!context.inRaw) collapseRuns(container, children, context);

	for (const child of children) {
		visit(child, {
			...context,
			isRoot: false,
			inRaw: context.inRaw || opensRawSubtree(child),
		});
	}
}

function collapseRuns(container: AstroNode, children: AstroNode[], context: Context): void {
	const dropped = new Set<AstroNode>();

	for (const [index, child] of children.entries()) {
		if (!isText(child)) continue;
		const prev = children[index - 1] ?? null;
		const next = children[index + 1] ?? null;

		if (isWhitespaceOnly(child)) {
			const decision = decide(rawTextOf(child), {
				container,
				context,
				prev,
				next,
				sides: [prev, next],
				atStart: prev === null,
				atEnd: next === null,
				loneChild: children.length === 1,
			});
			const text = resolve(rawTextOf(child), decision);
			if (text === '') dropped.add(child);
			else setText(child, text);
			continue;
		}

		const raw = rawTextOf(child);
		const lead = leadingWhitespace.exec(raw)?.[0] ?? '';
		const trail = trailingWhitespace.exec(raw)?.[0] ?? '';
		const body = raw.slice(lead.length, raw.length - trail.length);

		const leadDecision = decide(lead, {
			container,
			context,
			prev,
			next: child,
			sides: [prev],
			atStart: prev === null,
			atEnd: false,
			loneChild: false,
		});
		const trailDecision = decide(trail, {
			container,
			context,
			prev: child,
			next,
			sides: [next],
			atStart: false,
			atEnd: next === null,
			loneChild: false,
		});

		setText(child, resolve(lead, leadDecision) + body + resolve(trail, trailDecision));
	}

	if (dropped.size > 0) {
		const kept = children.filter((child) => !dropped.has(child));
		children.length = 0;
		children.push(...kept);
	}
}

// Dropping a newline run would also drop the blank lines prettier reproduces from it.
function resolve(run: string, decision: Decision): string {
	if (decision === 'drop') return hasNewline(run) ? run : '';
	if (decision === 'space') return ' ';
	return run;
}

function setText(node: AstroNode, text: string): void {
	node.raw = text;
	node.value = text;
}

interface Boundary {
	container: AstroNode;
	context: Context;
	prev: AstroNode | null;
	next: AstroNode | null;
	/** The neighbours whose CSS display decides significance; `null` stands for the container. */
	sides: (AstroNode | null)[];
	atStart: boolean;
	atEnd: boolean;
	loneChild: boolean;
}

function decide(run: string, boundary: Boundary): Decision {
	if (run === '') return 'keep';
	const { mode } = boundary.context;

	if (isSlotFallback(boundary)) return 'space';
	if (isFree(boundary)) return 'drop';
	if (mayAlterRenderedWhitespace(boundary)) return 'drop';

	if (mode === 'jsx') return hasNewline(run) ? 'keep' : 'space';

	// Prettier's JSX printer trims container-edge runs, which under `html`/`none` are rendered.
	return boundary.atStart || boundary.atEnd ? 'space' : 'keep';
}

function isFree(boundary: Boundary): boolean {
	const { container, context, atStart, atEnd, loneChild } = boundary;
	const { mode } = context;

	if (context.isRoot && (atStart || atEnd)) return true;
	if (container.type === 'JSXElement' && hasSetDirective(container)) return true;
	if (isExtractedStyle(boundary.prev) || isExtractedStyle(boundary.next)) return true;

	const tag = container.type === 'JSXElement' ? tagNameOf(container) : null;
	if (loneChild && tag !== null && isComponentName(tag)) return true;
	if (breaksChildren(container)) return true;

	if (mode === 'html') {
		if (loneChild) return true;
	}

	return false;
}

/** Whether the user authorised changing rendered whitespace here, not whether it is sound. */
function mayAlterRenderedWhitespace(boundary: Boundary): boolean {
	const { sensitivity } = boundary.context;
	if (sensitivity === 'ignore') return true;
	if (sensitivity === 'strict') return false;
	// One block box is enough: it swallows the whitespace on its side whatever the other neighbour is.
	return boundary.sides.some((side) =>
		side === null ? swallowsEdgeWhitespace(boundary.container) : isBlockBox(side),
	);
}

/** Any content at all, whitespace included, gives a `<slot>` a fallback body; nothing gives none. */
function isSlotFallback(boundary: Boundary): boolean {
	return (
		boundary.container.type === 'JSXElement' &&
		tagNameOf(boundary.container) === 'slot' &&
		boundary.loneChild
	);
}
