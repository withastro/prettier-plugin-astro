import type { AstPath, Doc, ParserOptions } from 'prettier';
import { doc } from 'prettier';
import { type AstroNode, astroVisitorKeys, ownChildren, synthetic } from '../ast';
import { estree } from '../estree';
import { opensRawSubtree } from '../whitespace';
import { printChildren } from './children';
import { embed } from './embed';

const { hardline } = doc.builders;
const { replaceEndOfLine } = doc.utils;

type PrintFn = (selector?: string | number | (string | number)[]) => Doc;

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

// No doc builder can cancel an indent nested inside a doc, so the root fragment's must be cut out.
function unwrapFragmentIndent(printed: Doc): Doc {
	const group = printed as { type?: string; contents?: Doc; expandedStates?: Doc[] };
	if (group.type !== 'group') return printed;
	if (group.expandedStates) {
		const states = group.expandedStates.map(unwrapFragmentIndent);
		return { ...group, contents: states[0], expandedStates: states } as Doc;
	}
	const parts = group.contents as Doc[];
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
		if (node[ownChildren]) return path.callParent(() => printChildren(path, options, print));
		if (node[synthetic]) return '';
		if (node.astroIgnored) {
			return replaceEndOfLine(options.originalText.slice(node.start, node.end));
		}
		if (astroVisitorKeys[node.type]) return printAstroNode(path, options, print);
		if (node.type === 'JSXAttribute') {
			const attribute = printAttribute(path, options, print);
			if (attribute) return attribute;
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
