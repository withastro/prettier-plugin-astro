import { BuiltInParser, BuiltInParsers, Doc, ParserOptions } from 'prettier';
import _doc from 'prettier/doc';
import { SassFormatter, SassFormatterConfig } from 'sass-formatter';
import { ExpressionNode } from './nodes';
import {
	AstPath,
	isNodeWithChildren,
	isTagLikeNode,
	manualDedent,
	printFn,
	printRaw,
} from './utils';

const {
	builders: { group, indent, join, line, softline, hardline },
	utils: { stripTrailingHardline, mapDoc },
} = _doc;

type supportedStyleLang = 'css' | 'scss' | 'sass';

// https://prettier.io/docs/en/plugins.html#optional-embed
export function embed(
	path: AstPath,
	print: printFn,
	textToDoc: (text: string, options: object) => Doc,
	opts: ParserOptions
) {
	const node = path.getValue();

	if (!node) return null;

	if (node.type === 'expression') {
		const jsxNode = makeNodeJSXCompatible<ExpressionNode>(node);
		const textContent = printRaw(jsxNode);

		let content: Doc;
		content = textToDoc(textContent, {
			...opts,
			parser: expressionParser,
		});

		content = stripTrailingHardline(content);

		// Create a Doc without the things we had to add to make the expression compatible with Babel
		const astroDoc = mapDoc(content, (doc) => {
			if (typeof doc === 'string' && doc.startsWith('__PRETTIER_SNIP__')) {
				return '';
			}

			return doc;
		});

		return ['{', astroDoc, '}'];
	}

	// Attribute using an expression as value
	if (node.type === 'attribute' && node.kind === 'expression') {
		const value = node.value.trim();
		const name = node.name.trim();

		let attrNodeValue = textToDoc(value, {
			...opts,
			parser: expressionParser,
		});

		attrNodeValue = stripTrailingHardline(attrNodeValue);

		if (name === value && opts.astroAllowShorthand) {
			return [line, '{', attrNodeValue, '}'];
		}

		return [line, name, '=', '{', attrNodeValue, '}'];
	}

	// Frontmatter
	if (node.type === 'frontmatter') {
		return [
			group([
				'---',
				hardline,
				textToDoc(node.value, { ...opts, parser: typescriptParser }),
				'---',
				hardline,
			]),
			hardline,
		];
	}

	// Script tags
	if (node.type === 'element' && node.name === 'script') {
		const scriptContent = printRaw(node);
		let formatttedScript = textToDoc(scriptContent, {
			...opts,
			parser: typescriptParser,
		});
		formatttedScript = stripTrailingHardline(formatttedScript);

		// print
		const attributes = path.map(print, 'attributes');
		const openingTag = group(['<script', indent(group(attributes)), softline, '>']);
		return [openingTag, indent([hardline, formatttedScript]), hardline, '</script>'];
	}

	// Style tags
	if (node.type === 'element' && node.name === 'style') {
		const content = printRaw(node);
		const supportedStyleLangValues = ['css', 'scss', 'sass'];
		let parserLang: supportedStyleLang = 'css';

		if (node.attributes) {
			const langAttribute = node.attributes.filter((x) => x.name === 'lang');
			if (langAttribute.length) {
				const styleLang = langAttribute[0].value.toLowerCase();
				if (supportedStyleLangValues.includes(styleLang))
					parserLang = styleLang as supportedStyleLang;
			}
		}

		return embedStyle(parserLang, content, path, print, textToDoc, opts);
	}

	return null;
}

function expressionParser(text: string, parsers: BuiltInParsers, opts: ParserOptions) {
	const expressionContent = forceIntoExpression(text);
	const parsingResult = wrapParserTryCatch(parsers.babel, expressionContent, opts);

	return {
		...parsingResult,
		program: parsingResult.program.body[0].expression.children[0].expression,
	};
}

function typescriptParser(text: string, parsers: BuiltInParsers, opts: ParserOptions) {
	return wrapParserTryCatch(parsers.typescript, text, opts);
}

function wrapParserTryCatch(parser: BuiltInParser, text: string, opts: ParserOptions) {
	try {
		return parser(text, opts);
	} catch (e) {
		// If we couldn't parse the expression (ex: syntax error) and we throw here, Prettier fallback to `print` and we'll
		// get a totally useless error message (ex: unhandled node type). An undocumented way to work around this is to set
		// `PRETTIER_DEBUG=1`, but nobody know that exists / want to do that just to get useful error messages. So we force it on
		process.env.PRETTIER_DEBUG = 'true';
		throw e;
	}
}

/**
 * Due to the differences between Astro and JSX, Prettier's TypeScript parsers (be it `typescript`, `babel` or `babel-ts`)
 * are not able to parse all expressions. A list of the difference that matters here:
 * - Astro allows a shorthand syntax for props. ex: `<Component {props} />`
 * - Astro allows multiple root elements. ex: `<div></div><div></div>`
 */
function makeNodeJSXCompatible<T>(node: any): T {
	const newNode = { ...node };

	if (isNodeWithChildren(newNode)) {
		newNode.children.forEach((child) => {
			if (isTagLikeNode(child)) {
				child.attributes.forEach((attr) => {
					// Transform shorthand attributes into their full format with a prefix so we can find them back
					if (attr.kind === 'shorthand') {
						attr.kind = 'expression';
						attr.value = attr.name;
						attr.name = '__PRETTIER_SNIP__' + attr.name;
					}
				});

				if (isNodeWithChildren(child)) {
					child = makeNodeJSXCompatible(child);
				}
			}
		});
	}

	return newNode;
}

function forceIntoExpression(statement: string): string {
	// note the trailing newline: if the statement ends in a // comment,
	// we can't add the closing bracket right afterwards
	return `<>{${statement}\n}</>`;
}

/**
 * Format the content of a style tag and print the entire element
 */
function embedStyle(
	lang: supportedStyleLang,
	content: string,
	path: AstPath,
	print: printFn,
	textToDoc: (text: string, options: object) => Doc,
	options: ParserOptions
) {
	switch (lang) {
		case 'css':
		case 'scss': {
			let formattedStyles;
			formattedStyles = textToDoc(content, {
				...options,
				parser: (text: string, parsers: BuiltInParsers, opts: ParserOptions) =>
					wrapParserTryCatch(parsers[lang], text, opts),
			});

			// The css parser appends an extra indented hardline, which we want outside of the `indent()`,
			// so we remove the last element of the array
			formattedStyles = stripTrailingHardline(formattedStyles);

			// print
			const attributes = path.map(print, 'attributes');
			const openingTag = group(['<style', indent(group(attributes)), softline, '>']);
			return [openingTag, indent([hardline, formattedStyles]), hardline, '</style>'];
		}
		case 'sass': {
			const lineEnding = options.endOfLine.toUpperCase() === 'CRLF' ? 'CRLF' : 'LF';
			const sassOptions: Partial<SassFormatterConfig> = {
				tabSize: options.tabWidth,
				insertSpaces: !options.useTabs,
				lineEnding,
			};

			// dedent the .sass, otherwise SassFormatter gets indentation wrong
			const { result: raw } = manualDedent(content);

			// format
			const formattedSassIndented = SassFormatter.Format(raw, sassOptions).trim();

			// print
			const formattedSass = join(hardline, formattedSassIndented.split('\n'));
			const attributes = path.map(print, 'attributes');
			const openingTag = group(['<style', indent(group(attributes)), softline, '>']);
			return [openingTag, indent(group([hardline, formattedSass])), hardline, '</style>'];
		}
	}
}
