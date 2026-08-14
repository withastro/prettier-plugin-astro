import { parse as parseAstro } from '@astrojs/compiler-rs';
import type { ParserOptions } from 'prettier';
import {
	type AstroNode,
	type JsComment,
	childrenOf,
	hasSetDirective,
	isComponentName,
	isNode,
	synthetic,
	tagNameOf,
	takeOverChildren,
	walk,
} from './ast';
import { rawTextElements, voidElements } from './elements';
import { printClassNames } from './printer/utils';
import {
	type Settings,
	blankContentIsFree,
	normalizeWhitespace,
	opensRawSubtree,
} from './whitespace';

interface Diagnostic {
	severity: string;
	text: string;
	labels: { line: number; column: number }[];
}

export function parse(source: string, options: ParserOptions): AstroNode {
	const { ast, diagnostics } = parseAstro(source) as unknown as {
		ast: AstroNode;
		diagnostics: Diagnostic[];
	};

	const failure = diagnostics.find((diagnostic) => diagnostic.severity === 'error');
	if (failure) throw syntaxError(failure);

	stripParenthesizedExpressions(ast);
	repairSpans(ast);
	markAttributes(ast, source);
	applyPrettierIgnore(ast);

	const body = ast.body as AstroNode[];
	const template = templateFragment(ast, body);
	const settings = {
		mode: options.astroCompressHTML,
		sensitivity: options.htmlWhitespaceSensitivity,
	};
	// Prettier always breaks between two adjacent non-text children, which only `jsx` can absorb.
	if (settings.mode === 'jsx') normalizeWhitespace(template.node as AstroNode, settings);
	else resolveBlankContainers(template.node as AstroNode, settings);
	normalizeTagPairs(body, source);
	if (settings.mode !== 'jsx') claimChildren(template.node as AstroNode);

	ast.template = template;
	delete ast.body;
	ast.comments = printableComments(ast);
	return ast;
}

function syntaxError(diagnostic: Diagnostic): Error {
	const label = diagnostic.labels[0];
	const line = label?.line ?? 1;
	const column = (label?.column ?? 0) + 1;
	const error = new SyntaxError(`${diagnostic.text} (${line}:${column})`);
	(error as Error & { loc: unknown }).loc = { start: { line, column } };
	return error;
}

// oxc emits explicit nodes; prettier re-derives parens itself and the two compound on every pass.
function stripParenthesizedExpressions(root: AstroNode): void {
	walk(root, (node) => {
		for (const key of Object.keys(node)) {
			const value = node[key];
			if (Array.isArray(value)) {
				for (const [index, item] of value.entries()) {
					value[index] = unwrapParens(item);
				}
			} else if (isNode(value)) {
				node[key] = unwrapParens(value);
			}
		}
	});
}

function unwrapParens(node: unknown): unknown {
	let current = node;
	while (isNode(current) && current.type === 'ParenthesizedExpression') {
		current = current.expression;
	}
	return current;
}

// `AstroScript` spans the whole `<script>` element, overlapping the tags prettier sorts it against.
function repairSpans(root: AstroNode): void {
	walk(root, (node) => {
		if (node.type !== 'JSXElement') return;
		const script = (node.children as AstroNode[]).find((child) => child.type === 'AstroScript');
		if (!script) return;
		script.start = (node.openingElement as AstroNode).end;
		script.end = (node.closingElement as AstroNode | null)?.start ?? node.end;
	});
}

function markAttributes(root: AstroNode, source: string): void {
	walk(root, (node) => {
		if (node.type !== 'JSXAttribute') return;
		const value = node.value as AstroNode | null;
		if (!value) return;

		if (value.type === 'Literal' && typeof value.value === 'string') {
			const name = (node.name as AstroNode).name;
			const text = name === 'class' ? printClassNames(value.value) : value.value;
			if (value.raw === null || text !== value.value) {
				value.value = text;
				value.raw = `"${text.replaceAll('"', '&quot;')}"`;
			}
			return;
		}
		if (value.type !== 'JSXExpressionContainer') return;

		if (source[node.start] === '{') node.astroShorthand = true;
		if (source[value.start] === '`') node.astroBacktick = true;
	});
}

function applyPrettierIgnore(root: AstroNode): void {
	walk(root, (node) => {
		const children = node.type === 'AstroRoot' ? (node.body as AstroNode[]) : childrenOf(node);
		if (children === null) return;
		for (const [index, child] of children.entries()) {
			if (child.type !== 'AstroComment') continue;
			if (String(child.value).trim() !== 'prettier-ignore') continue;
			const target = children.slice(index + 1).find((sibling) => sibling.type !== 'JSXText');
			if (target) target.astroIgnored = true;
		}
	});
}

function templateFragment(root: AstroNode, body: AstroNode[]): AstroNode {
	const start = body[0]?.start ?? root.end;
	const end = body.at(-1)?.end ?? root.end;
	return {
		type: 'JsExpressionRoot',
		start,
		end,
		node: {
			type: 'JSXFragment',
			start,
			end,
			astroRoot: true,
			openingFragment: { type: 'JSXOpeningFragment', start, end: start, [synthetic]: true },
			children: body,
			closingFragment: { type: 'JSXClosingFragment', start: end, end, [synthetic]: true },
		},
	};
}

function pairUp(node: AstroNode, tag: string): void {
	(node.openingElement as AstroNode).selfClosing = false;
	node.closingElement = {
		type: 'JSXClosingElement',
		start: node.end,
		end: node.end,
		name: { type: 'JSXIdentifier', name: tag, start: node.end, end: node.end },
	};
}

// Requiring the newline keeps the lone space `resolveBlankContainers` leaves behind, which is content.
function printsNothing(child: AstroNode): boolean {
	const raw = String(child.raw ?? '');
	return child.type === 'JSXText' && raw.trim() === '' && /[\n\r]/.test(raw);
}

function normalizeTagPairs(body: AstroNode[], source: string): void {
	walk(body, (node) => {
		if (node.type !== 'JSXElement') return;
		const tag = tagNameOf(node);
		if (tag === null) return;
		const children = node.children as AstroNode[];
		const closing = node.closingElement as AstroNode | null;
		const component = isComponentName(tag);

		if (rawTextElements.has(tag) && !component) {
			if (!closing) pairUp(node, tag);
			else if (source.slice((node.openingElement as AstroNode).end, closing.start).trim() === '') {
				children.length = 0;
			}
			return;
		}

		const selfClosable =
			component || voidElements.has(tag) || tag === 'slot' || hasSetDirective(node);

		if (children.every(printsNothing) && selfClosable && closing) {
			(node.openingElement as AstroNode).selfClosing = true;
			node.closingElement = null;
		}
	});
}

// Decided here rather than in the children printer so tag pairing sees the final child count.
function resolveBlankContainers(template: AstroNode, settings: Settings): void {
	walk(template, (node) => {
		if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') return;
		if (node.type === 'JSXElement' && opensRawSubtree(node)) return;
		const children = node.children as AstroNode[];
		if (children.length === 0) return;
		const blank = children.every(
			(child) => child.type === 'JSXText' && String(child.raw ?? '').trim() === '',
		);
		if (!blank) return;

		const run = children.map((child) => String(child.raw ?? '')).join('');
		const free = blankContentIsFree(node, run, node.astroRoot === true, settings);
		children.length = 0;
		if (!free) {
			children.push({ type: 'JSXText', start: node.start, end: node.start, raw: ' ', value: ' ' });
		}
	});
}

function claimChildren(template: AstroNode): void {
	walk(template, (node) => {
		if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') return;
		if (node.type === 'JSXElement' && opensRawSubtree(node)) return;
		takeOverChildren(node);
	});
}

// Prettier throws on any comment it never printed, so drop the ones inside reprinted-from-source regions.
function printableComments(root: AstroNode): JsComment[] {
	const comments = (root.comments as JsComment[] | undefined) ?? [];
	if (comments.length === 0) return comments;

	const frontmatter = root.frontmatter as AstroNode;
	const skipped: [number, number][] = [];
	if (frontmatter.end > 0) skipped.push([frontmatter.start, frontmatter.end]);

	walk(root, (node) => {
		if (node.astroIgnored) {
			skipped.push([node.start, node.end]);
			return;
		}
		if (!opensRawSubtree(node)) return;
		const closing = node.closingElement as AstroNode | null;
		skipped.push([(node.openingElement as AstroNode).end, closing?.start ?? node.end]);
	});

	return comments.filter(
		(comment) => !skipped.some(([start, end]) => comment.start >= start && comment.end <= end),
	);
}
