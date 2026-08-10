import type { AstPath, BuiltInParserName, Doc, Options, ParserOptions } from 'prettier';
import { doc } from 'prettier';
import { SassFormatter, type SassFormatterConfig } from 'sass-formatter';
import { type AstroNode, attributeStringValue, tagNameOf } from '../ast';
import { estree } from '../estree';
import { opensRawSubtree } from '../whitespace';
import { manualDedent } from './utils';

const { group, hardline, indent, join } = doc.builders;
const { replaceEndOfLine } = doc.utils;

type TextToDoc = (text: string, options: Options) => Promise<Doc>;
type PrintFn = (selector?: string | number | (string | number)[]) => Doc;

const styleParsers: Record<string, BuiltInParserName> = {
	css: 'css',
	scss: 'scss',
	less: 'less',
};

// Prettier swallows every error thrown inside `embed` unless this is set, leaving a useless message.
async function surfacingErrors(textToDoc: TextToDoc, text: string, options: Options) {
	try {
		return await textToDoc(text, options);
	} catch (error) {
		process.env.PRETTIER_DEBUG = 'true';
		throw error;
	}
}

// Adapted from: https://github.com/prettier/prettier/blob/main/src/language-html/utils/index.js
function inferParserByTypeAttribute(type: string | null): BuiltInParserName {
	switch (type) {
		case null:
		case 'module':
		case 'text/javascript':
		case 'text/babel':
		case 'application/javascript':
			return 'babel';
		case 'application/x-typescript':
			return 'babel-ts';
		case 'text/markdown':
			return 'markdown';
		case 'text/html':
			return 'html';
		case 'text/x-handlebars-template':
			return 'glimmer';
		default:
			if (type.endsWith('json') || type.endsWith('importmap') || type === 'speculationrules') {
				return 'json';
			}
			return 'babel-ts';
	}
}

function contentOf(node: AstroNode, options: ParserOptions): string {
	const start = (node.openingElement as AstroNode).end;
	const end = (node.closingElement as AstroNode | null)?.start ?? node.end;
	return options.originalText.slice(start, end);
}

function wrapContent(print: PrintFn, content: Doc, isEmpty: boolean): Doc {
	return [
		print('openingElement'),
		indent([isEmpty ? '' : hardline, content]),
		isEmpty ? '' : hardline,
		print('closingElement'),
	];
}

function embedSass(source: string, options: ParserOptions): Doc {
	const sassOptions: Partial<SassFormatterConfig> = {
		tabSize: options.tabWidth,
		insertSpaces: !options.useTabs,
		lineEnding: options.endOfLine.toUpperCase() === 'CRLF' ? 'CRLF' : 'LF',
	};
	const { result } = manualDedent(source);
	return join(hardline, SassFormatter.Format(result, sassOptions).trim().split('\n'));
}

export function embed(path: AstPath<AstroNode>, options: ParserOptions) {
	const node = path.node;
	if (node.astroIgnored) return undefined;

	if (node.type === 'AstroFrontmatter') {
		if (node.end === 0 || options.astroSkipFrontmatter) return undefined;
		// `Program.start` skips leading comments and `node.start` includes preceding whitespace.
		const fence = options.originalText.indexOf('---', node.start);
		const source = options.originalText.slice(fence + 3, node.end - 3);
		if (!source.trim()) return undefined;
		return async (textToDoc: TextToDoc) => [
			'---',
			hardline,
			await surfacingErrors(textToDoc, source, { ...options, parser: 'babel-ts' }),
			hardline,
			'---',
		];
	}

	if (node.type !== 'JSXElement') return estree.embed(path, options);
	const tag = tagNameOf(node);
	if (tag === null || !node.closingElement) return estree.embed(path, options);

	const source = contentOf(node, options);
	const isEmpty = source.trim() === '';

	if (tag === 'script') {
		if (isEmpty) return estree.embed(path, options);
		const parser = inferParserByTypeAttribute(attributeStringValue(node, 'type'));
		return async (textToDoc: TextToDoc, print: PrintFn) =>
			wrapContent(print, await surfacingErrors(textToDoc, source, { ...options, parser }), false);
	}

	if (tag === 'style') {
		if (isEmpty) return estree.embed(path, options);
		const lang = attributeStringValue(node, 'lang')?.toLowerCase() ?? 'css';
		if (lang === 'sass') {
			return (_textToDoc: TextToDoc, print: PrintFn) =>
				wrapContent(print, embedSass(source, options), false);
		}
		const parser = styleParsers[lang];
		if (!parser) return printVerbatim(source);
		return async (textToDoc: TextToDoc, print: PrintFn) =>
			wrapContent(print, await surfacingErrors(textToDoc, source, { ...options, parser }), false);
	}

	if (opensRawSubtree(node)) {
		return (_textToDoc: TextToDoc, print: PrintFn) => [
			print('openingElement'),
			replaceEndOfLine(source),
			print('closingElement'),
		];
	}

	return estree.embed(path, options);
}

function printVerbatim(source: string) {
	return (_textToDoc: TextToDoc, print: PrintFn) =>
		group([print('openingElement'), replaceEndOfLine(source), print('closingElement')]);
}
