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

interface Settings {
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
	return displayOfTag(tag);
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

	if (mode === 'html') {
		if (loneChild) return true;
		if (tag === 'head') return true;
	}

	return false;
}

/** Whether the user authorised changing rendered whitespace here, not whether it is sound. */
function mayAlterRenderedWhitespace(boundary: Boundary): boolean {
	const { sensitivity } = boundary.context;
	if (sensitivity === 'ignore') return true;
	if (sensitivity === 'strict') return false;
	return boundary.sides.every((side) => !isInlineDisplay(displayOf(side ?? boundary.container)));
}

/** Any content at all, whitespace included, gives a `<slot>` a fallback body; nothing gives none. */
function isSlotFallback(boundary: Boundary): boolean {
	return (
		boundary.container.type === 'JSXElement' &&
		tagNameOf(boundary.container) === 'slot' &&
		boundary.loneChild
	);
}
