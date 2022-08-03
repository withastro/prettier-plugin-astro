import { BuiltInParsers, Doc, ParserOptions } from 'prettier';
import _doc from 'prettier/doc';
import { SassFormatter, SassFormatterConfig } from 'sass-formatter';
import { anyNode, ExpressionNode } from './nodes';
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
		// This is a bit of a hack, but I'm not sure how else to pass the original, pre-JSX transformations to the parser?
		const originalContent = printRaw(node);
		(opts as any).originalContent = originalContent;

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
				textToDoc(node.value, { ...opts, parser: 'typescript' }),
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
			parser: 'typescript',
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
	let parsingResult;
	const expressionContent = forceIntoExpression(text);

	try {
		parsingResult = parsers.babel(expressionContent, opts);
	} catch (e: any) {
		if (process.env.PRETTIER_DEBUG) {
			throw e;
		}

		// If we couldn't parse the expression (ex: syntax error) and we return the result, Prettier will fail with a not
		// very interesting error message (ex: unhandled node type 'expression'), as such we'll instead just return the unformatted result
		console.error(e);

		return (opts as any).originalContent;
	}

	return {
		...parsingResult,
		program: parsingResult.program.body[0].expression.children[0].expression,
	};
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
			let formattedStyles = textToDoc(content, {
				...options,
				parser: lang,
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
