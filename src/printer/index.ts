import type { AstPath, Doc, ParserOptions } from 'prettier';
import { doc } from 'prettier';
import { type AstroNode, astroVisitorKeys, ownChildren, synthetic } from '../ast';
import { estree } from '../estree';
import { forcesBreak, opensRawSubtree, swallowsEdgeWhitespace } from '../whitespace';
import { lends, printChildren } from './children';
import { embed } from './embed';
import { printSrcset } from './utils';

const { group, hardline, indent, line, softline } = doc.builders;
const { replaceEndOfLine } = doc.utils;

type PrintFn = (selector?: string | number | (string | number)[], args?: unknown) => Doc;

function printDoctype(value: string): string {
	const trimmed = value.trim();
	const space = trimmed.search(/\s/);
	const name = space === -1 ? trimmed : trimmed.slice(0, space);
	const rest = space === -1 ? '' : trimmed.slice(space);
	return `<!doctype ${name.toLowerCase()}${rest}>`;
}

function printAstroNode(path: AstPath<AstroNode>, options: ParserOptions, print: PrintFn): Doc {
	const node = path.node;
	switch (node.type) {
		case 'AstroRoot': {
			const template = node.template as AstroNode;
			const hasTemplate = ((template.node as AstroNode).children as AstroNode[]).length > 0;
			const parts: Doc[] = [];
			if ((node.frontmatter as AstroNode).end > 0) {
				parts.push(print('frontmatter'));
				if (hasTemplate) parts.push(hardline, hardline);
			}
			if (hasTemplate) parts.push(print('template'));
			return [parts, hardline];
		}
		case 'AstroFrontmatter': {
			const body = (node.program as AstroNode).body as unknown[];
			if (options.astroSkipFrontmatter) {
				const fence = options.originalText.indexOf('---', node.start);
				return replaceEndOfLine(options.originalText.slice(fence, node.end));
			}
			return body.length > 0
				? ['---', hardline, print('program'), '---']
				: ['---', hardline, '---'];
		}
		case 'AstroScript':
			return ((node.program as AstroNode).body as unknown[]).length > 0 ? print('program') : '';
		case 'AstroDoctype':
			return printDoctype(node.value as string);
		case 'AstroComment':
			return `<!--${node.value as string}-->`;
		default:
			return '';
	}
}

function printAttribute(
	path: AstPath<AstroNode>,
	options: ParserOptions,
	print: PrintFn,
): Doc | null {
	const node = path.node;
	const name = (node.name as AstroNode).name as string;
	const value = node.value as AstroNode | null;

	if (node.astroShorthand) return ['{', print(['value', 'expression']), '}'];

	if (node.astroBacktick) return [name, '=', print(['value', 'expression'])];

	// The value is already normalised by the parser; only spreading it over lines is a layout call.
	if (
		options.astroCompressHTML !== 'jsx' &&
		(name === 'srcset' || name === 'sizes') &&
		value?.type === 'Literal' &&
		typeof value.value === 'string' &&
		value.value.trim() !== ''
	) {
		return [name, '="', printSrcset(value.value), '"'];
	}

	const expression =
		value?.type === 'JSXExpressionContainer' ? (value.expression as AstroNode) : null;
	if (
		options.astroAllowShorthand &&
		expression?.type === 'Identifier' &&
		expression.name === name
	) {
		return ['{', print(['value', 'expression']), '}'];
	}

	return null;
}

// Prettier hugs a lone string attribute with a plain space, leaving its tag no line to wrap at.
function printBreakableOpeningTag(
	path: AstPath<AstroNode>,
	options: ParserOptions,
	print: PrintFn,
): Doc | null {
	const node = path.node;
	const attributes = node.attributes as AstroNode[];
	if (attributes.length !== 1) return null;
	const value = attributes[0].value as AstroNode | null;
	if (value?.type !== 'Literal' || typeof value.value !== 'string') return null;
	if (value.value.includes('\n')) return null;

	const end: Doc[] = node.selfClosing
		? [line, '/>']
		: options.bracketSameLine
			? ['>']
			: [softline, '>'];
	return group(['<', print('name'), indent([line, print(['attributes', 0])]), ...end]);
}

// Breaking an inline element beside its content renders as an added space; moving the brackets does not.
function printWithDanglingBrackets(
	path: AstPath<AstroNode>,
	options: ParserOptions,
	print: PrintFn,
	lending: boolean,
): Doc | null {
	const node = path.node;
	const children = node.astroChildren as AstroNode[] | undefined;
	if (!children?.length || !node.closingElement) return null;
	if (swallowsEdgeWhitespace(node)) return null;
	if (startsWithSpace(children[0]) || endsWithSpace(children.at(-1)!)) return null;

	const opening = print('openingElement') as { type?: string; contents?: Doc[] };
	if (opening.type !== 'group' || !Array.isArray(opening.contents)) return null;
	const contents = opening.contents.filter((part) => part !== '');
	if (contents.at(-1) !== '>') return null;

	const tag = (node.closingElement as AstroNode).name as AstroNode;
	const head = { ...opening, contents: contents.slice(0, -1) } as Doc;
	const body = print(['children', 0], 'fill');
	const shouldBreak = forcesBreak(node);

	// A self-closing last child lends its own `/>` instead, keeping our closing tag whole.
	if (isSelfClosing(children.at(-1)!)) {
		const lentBody = print(['children', 0], 'fill-lending');
		return group([head, indent([softline, '>', lentBody]), line, '/>', `</${tag.name}>`], {
			shouldBreak,
		});
	}
	return group(
		[head, indent([softline, '>', body, '</', tag.name as string]), softline, lending ? '' : '>'],
		{ shouldBreak },
	);
}

const isSelfClosing = (node: AstroNode): boolean =>
	node.type === 'JSXElement' && !node.closingElement;

// The lender drops the space or line before its `/>` too: the borrower supplies its own.
function withoutSelfClosingMarker(printed: Doc): Doc {
	if (Array.isArray(printed)) {
		return printed.at(-1) === ' />' ? printed.slice(0, -1) : printed;
	}
	const tag = printed as { type?: string; contents?: Doc[] };
	if (tag.type !== 'group' || !Array.isArray(tag.contents)) return printed;
	if (tag.contents.at(-1) !== '/>') return printed;
	return { ...tag, contents: tag.contents.slice(0, -2) } as Doc;
}

const startsWithSpace = (child: AstroNode): boolean =>
	child.type === 'JSXText' && /^[\t\n\f\r ]/.test(String(child.raw ?? ''));

const endsWithSpace = (child: AstroNode): boolean =>
	child.type === 'JSXText' && /[\t\n\f\r ]$/.test(String(child.raw ?? ''));

// No doc builder can cancel an indent nested inside a doc, so the root fragment's must be cut out.
function unwrapFragmentIndent(printed: Doc): Doc {
	const fragment = printed as { type?: string; contents?: Doc; expandedStates?: Doc[] };
	if (fragment.type !== 'group') return printed;
	if (fragment.expandedStates) {
		const states = fragment.expandedStates.map(unwrapFragmentIndent);
		return { ...fragment, contents: states[0], expandedStates: states } as Doc;
	}
	const parts = fragment.contents as Doc[];
	if (!Array.isArray(parts) || parts.length !== 4) return printed;
	const indented = parts[1] as { type?: string; contents?: Doc[] };
	if (indented.type !== 'indent' || !indented.contents) return printed;
	return indented.contents[1];
}

export const printer = {
	...estree,
	embed,
	getVisitorKeys(node: AstroNode, nonTraversableKeys: Set<string>): string[] {
		const keys = astroVisitorKeys[node.type] ?? estree.getVisitorKeys(node, nonTraversableKeys);
		return node.astroChildren
			? keys.map((key) => (key === 'children' ? 'astroChildren' : key))
			: keys;
	},
	print(path: AstPath<AstroNode>, options: ParserOptions, print: PrintFn, args?: unknown): Doc {
		const node = path.node;
		if (node[ownChildren]) {
			return path.callParent(() => printChildren(path, options, print, args as 'fill' | 'loose' | undefined));
		}
		if (node[synthetic]) return '';
		if (node.astroIgnored) {
			return replaceEndOfLine(options.originalText.slice(node.start, node.end));
		}
		if (astroVisitorKeys[node.type]) return printAstroNode(path, options, print);
		if (node.type === 'JSXAttribute') {
			const attribute = printAttribute(path, options, print);
			if (attribute) return attribute;
		}
		if (node.type === 'JSXOpeningElement' && options.astroCompressHTML !== 'jsx') {
			const opening = printBreakableOpeningTag(path, options, print);
			if (opening) return opening;
		}
		if (node.type === 'JSXElement' && args === lends && isSelfClosing(node)) {
			return withoutSelfClosingMarker(print('openingElement'));
		}
		if (node.type === 'JSXElement' && node.astroChildren && !opensRawSubtree(node)) {
			const dangling = printWithDanglingBrackets(path, options, print, args === lends);
			if (dangling) return dangling;
			const tag = ((node.closingElement as AstroNode).name as AstroNode).name as string;
			return group(
				[
					print('openingElement'),
					print(['children', 0], 'loose'),
					args === lends ? ['</', tag] : print('closingElement'),
				],
				{ shouldBreak: forcesBreak(node) },
			);
		}
		// Reached when `embeddedLanguageFormatting` is off; reflowing raw content would corrupt it.
		if (
			node.type === 'JSXElement' &&
			node.closingElement &&
			(node.children as AstroNode[]).length > 0 &&
			opensRawSubtree(node)
		) {
			const start = (node.openingElement as AstroNode).end;
			const end = (node.closingElement as AstroNode).start;
			return [
				print('openingElement'),
				replaceEndOfLine(options.originalText.slice(start, end)),
				print('closingElement'),
			];
		}
		const printed = estree.print(path, options, print, args) as Doc;
		if ((node.openingFragment as AstroNode | undefined)?.[synthetic]) {
			return unwrapFragmentIndent(printed);
		}
		return printed;
	},
};
