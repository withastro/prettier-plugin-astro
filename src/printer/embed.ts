import type { AstPath, BuiltInParserName, Doc, Options, ParserOptions } from 'prettier';
import { doc } from 'prettier';
import { SassFormatter, type SassFormatterConfig } from 'sass-formatter';
import { type AstroNode, attributeStringValue, attributesOf, tagNameOf } from '../ast';
import { estree } from '../estree';
import { opensRawSubtree } from '../whitespace';
import { manualDedent } from './utils';

const { group, hardline, indent, join, softline } = doc.builders;
const { mapDoc, removeLines, replaceEndOfLine } = doc.utils;

/** The value is printed inside a double-quoted attribute, which a quote from the CSS printer would end. */
const escapeQuotes = (value: Doc): Doc =>
	mapDoc(value, (part) => (typeof part === 'string' ? part.replaceAll('"', '&quot;') : part));

/** The parser leaves quote entities encoded, and CSS has no grammar for them. */
const decodeQuoteEntities = (text: string): string =>
	text.replaceAll('&apos;', "'").replaceAll('&quot;', '"');

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

function inferScriptParser(node: AstroNode): BuiltInParserName {
	// Astro only processes scripts carrying no attribute other than `src`, and those are TypeScript.
	const processed = attributesOf(node).every(
		(attribute) =>
			attribute.type === 'JSXAttribute' && (attribute.name as AstroNode).name === 'src',
	);
	if (processed) return 'babel-ts';
	return inferParserByTypeAttribute(attributeStringValue(node, 'type'));
}

function styleAttributeValue(node: AstroNode): string | null {
	if ((node.name as AstroNode).name !== 'style') return null;
	const value = node.value as AstroNode | null;
	if (value?.type !== 'Literal' || typeof value.value !== 'string') return null;
	return value.value.trim() === '' ? null : value.value;
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

	if (node.type === 'JSXAttribute') {
		const style = styleAttributeValue(node);
		if (style !== null) {
			return async (textToDoc: TextToDoc) => {
				// The flag makes prettier's CSS printer emit a declaration list rather than a stylesheet.
				const declarations = await textToDoc(decodeQuoteEntities(style), {
					...options,
					parser: 'css',
					__isHTMLStyleAttribute: true,
				} as Options);
				const value = escapeQuotes(declarations);
				// Normalising the value is safe anywhere; spreading it over lines is a layout call.
				if (options.astroCompressHTML === 'jsx') return ['style="', removeLines(value), '"'];
				return ['style="', group([indent([softline, value]), softline]), '"'];
			};
		}
	}

	if (node.type !== 'JSXElement') return estree.embed(path, options);
	const tag = tagNameOf(node);
	if (tag === null || !node.closingElement) return estree.embed(path, options);

	const source = contentOf(node, options);
	const isEmpty = source.trim() === '';

	if (tag === 'script') {
		if (isEmpty) return estree.embed(path, options);
		const parser = inferScriptParser(node);
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
