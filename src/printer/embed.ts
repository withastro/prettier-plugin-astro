import { Buffer } from 'node:buffer';
import type { BuiltInParserName, Doc, Options } from 'prettier';
import _doc from 'prettier/doc';
import { SassFormatter, type SassFormatterConfig } from 'sass-formatter';
import type { AttributeNode, ExpressionNode, FragmentNode, Node } from './nodes';
import {
	atSignReplace,
	closingBracketReplace,
	dotReplace,
	inferParserByTypeAttribute,
	interrogationReplace,
	isNodeWithChildren,
	isTagLikeNode,
	isTextNode,
	manualDedent,
	openingBracketReplace,
	printRaw,
	type AstPath,
	type ParserOptions,
	type printFn,
} from './utils';

const {
	builders: { group, indent, join, line, softline, hardline, lineSuffixBoundary },
	utils: { stripTrailingHardline, mapDoc },
} = _doc;

const supportedStyleLangValues = ['css', 'scss', 'sass', 'less'] as const;
type supportedStyleLang = (typeof supportedStyleLangValues)[number];

// https://prettier.io/docs/en/plugins.html#optional-embed
type TextToDoc = (text: string, options: Options) => Promise<Doc>;

type Embed =
	| ((
			path: AstPath,
			options: Options
	  ) =>
			| ((
					textToDoc: TextToDoc,
					print: (selector?: string | number | Array<string | number> | AstPath) => Doc,
					path: AstPath,
					options: Options
			  ) => Promise<Doc | undefined> | Doc | undefined)
			| Doc
			| null)
	| undefined;

export const embed = ((path: AstPath, options: Options) => {
	const parserOption = options as ParserOptions;
	return async (textToDoc, print) => {
		const node = path.node;

		if (!node) return undefined;

		if (node.type === 'expression') {
			const jsxNode = makeNodeJSXCompatible<ExpressionNode>(node);
			const textContent = printRaw(jsxNode);

			let content: Doc;

			content = await wrapParserTryCatch(textToDoc, textContent, {
				...options,
				parser: 'astroExpressionParser',
			});

			content = stripTrailingHardline(content);

			// HACK: Bit of a weird hack to get if a document is exclusively comments
			// Using `mapDoc` directly to build the array for some reason caused it to always be undefined? Not sure why
			const strings: string[] = [];
			mapDoc(content, (doc) => {
				if (typeof doc === 'string') {
					strings.push(doc);
				}
			});

			if (strings.every((value) => value.startsWith('//'))) {
				return group(['{', content, softline, lineSuffixBoundary, '}']);
			}

			// Create a Doc without the things we had to add to make the expression compatible with Babel
			const astroDoc = mapDoc(content, (doc) => {
				if (typeof doc === 'string') {
					doc = doc.replaceAll(openingBracketReplace, '{');
					doc = doc.replaceAll(closingBracketReplace, '}');
					doc = doc.replaceAll(atSignReplace, '@');
					doc = doc.replaceAll(dotReplace, '.');
					doc = doc.replaceAll(interrogationReplace, '?');
				}

				return doc;
			});

			return group(['{', indent([softline, astroDoc]), softline, lineSuffixBoundary, '}']);
		}

		// Attribute using an expression as value
		if (node.type === 'attribute' && node.kind === 'expression') {
			const value = node.value.trim();
			const name = node.name.trim();

			const attrNodeValue = await wrapParserTryCatch(textToDoc, value, {
				...options,
				parser: 'astroExpressionParser',
			});

			if (name === value && options.astroAllowShorthand) {
				return [line, '{', attrNodeValue, '}'];
			}

			return [line, name, '=', '{', attrNodeValue, '}'];
		}

		if (node.type === 'attribute' && node.kind === 'spread') {
			const spreadContent = await wrapParserTryCatch(textToDoc, node.name, {
				...options,
				parser: 'astroExpressionParser',
			});

			return [line, '{...', spreadContent, '}'];
		}

		// Frontmatter
		if (node.type === 'frontmatter') {
			const frontmatterContent = await wrapParserTryCatch(textToDoc, node.value, {
				...options,
				parser: 'babel-ts',
			});

			return [group(['---', hardline, frontmatterContent, hardline, '---', hardline]), hardline];
		}

		// Script tags
		if (node.type === 'element' && node.name === 'script' && node.children.length) {
			const typeAttribute = node.attributes.find((attr) => attr.name === 'type')?.value;

			let parser: BuiltInParserName = 'babel-ts';
			if (typeAttribute) {
				parser = inferParserByTypeAttribute(typeAttribute);
			}

			const scriptContent = printRaw(node);
			let formattedScript = await wrapParserTryCatch(textToDoc, scriptContent, {
				...options,
				parser: parser,
			});

			formattedScript = stripTrailingHardline(formattedScript);
			const isEmpty = /^\s*$/.test(scriptContent);

			// print
			const attributes = path.map(print, 'attributes');
			const openingTag = group(['<script', indent(group(attributes)), softline, '>']);
			return [
				openingTag,
				indent([isEmpty ? '' : hardline, formattedScript]),
				isEmpty ? '' : hardline,
				'</script>',
			];
		}

		// Style tags
		if (node.type === 'element' && node.name === 'style') {
			const content = printRaw(node);
			let parserLang: supportedStyleLang | undefined = 'css';

			if (node.attributes) {
				const langAttribute = node.attributes.filter((x) => x.name === 'lang');
				if (langAttribute.length) {
					const styleLang = langAttribute[0].value.toLowerCase() as supportedStyleLang;
					parserLang = supportedStyleLangValues.includes(styleLang) ? styleLang : undefined;
				}
			}

			return await embedStyle(parserLang, content, path, print, textToDoc, parserOption);
		}

		return undefined;
	};
}) satisfies Embed;

async function wrapParserTryCatch(cb: TextToDoc, text: string, options: Options) {
	try {
		return await cb(text, options);
	} catch (e) {
		// If we couldn't parse the expression (ex: syntax error) and we throw here, Prettier fallback to `print` and we'll
		// get a totally useless error message (ex: unhandled node type). An undocumented way to work around this is to set
		// `PRETTIER_DEBUG=1`, but nobody know that exists / want to do that just to get useful error messages. So we force it on
		process.env.PRETTIER_DEBUG = 'true';
		throw e;
	}
}

/**
 * Due to the differences between Astro and JSX, Prettier's TypeScript parsers (be it `typescript` or `babel-ts`) are not
 * able to parse all expressions. So we need to first make the expression compatible before passing it to the parser
 *
 * A list of the difference that matters here:
 * - Astro allows a shorthand syntax for props. ex: `<Component {props} />`
 * - Astro allows multiple root elements. ex: `<div></div><div></div>`
 * - Astro allows attributes to include at signs (@) and dots (.)
 */
function makeNodeJSXCompatible<T>(node: any): T {
	const newNode = { ...node };
	const childBundle: Node[][] = [];
	let childBundleIndex = 0;

	if (isNodeWithChildren(newNode)) {
		newNode.children = newNode.children.reduce((result: Node[], child, index) => {
			const previousChildren = newNode.children[index - 1];
			const nextChildren = newNode.children[index + 1];
			if (isTagLikeNode(child)) {
				child.attributes = child.attributes.map(makeAttributeJSXCompatible);

				if (!childBundle[childBundleIndex]) {
					childBundle[childBundleIndex] = [];
				}

				if (isNodeWithChildren(child)) {
					child = makeNodeJSXCompatible<typeof child>(child);
				}

				// If we don't have a previous children, or it's not an element AND
				// we have a next children, and it's an element. Add the current children to the bundle
				if (
					(!previousChildren || isTextNode(previousChildren)) &&
					nextChildren &&
					isTagLikeNode(nextChildren)
				) {
					childBundle[childBundleIndex].push(child);
					return result;
				}

				// If we have a previous children, and it's an element AND
				// we have a next children, and it's also an element. Add the current children to the bundle
				if (
					previousChildren &&
					isTagLikeNode(previousChildren) &&
					nextChildren &&
					isTagLikeNode(nextChildren)
				) {
					childBundle[childBundleIndex].push(child);
					return result;
				}

				// If we have elements in our bundle, and there's no next children, or it's a text node
				// Create a fake parent, and add all the previous encountered elements as children of it
				if (
					(!nextChildren || isTextNode(nextChildren)) &&
					childBundle[childBundleIndex].length > 0
				) {
					childBundle[childBundleIndex].push(child);

					const parentNode: FragmentNode = {
						type: 'fragment',
						name: '',
						attributes: [],
						children: childBundle[childBundleIndex],
					};

					childBundleIndex += 1;
					result.push(parentNode);
					return result;
				}
			} else {
				childBundleIndex += 1;
			}

			result.push(child);
			return result;
		}, []);
	}

	return newNode;

	function makeAttributeJSXCompatible(attr: AttributeNode): AttributeNode {
		// Transform shorthand attributes into an empty attribute, ex: `{shorthand}` becomes `shorthand` and wrap it
		// so we can transform it back into {}
		if (attr.kind === 'shorthand') {
			attr.kind = 'empty';
			attr.name = openingBracketReplace + attr.name + closingBracketReplace;
		}

		// For spreads, we don't need to do anything because it should already be JSX compatible
		if (attr.kind !== 'spread') {
			if (attr.name.includes('@')) {
				attr.name = attr.name.replaceAll('@', atSignReplace);
			}

			if (attr.name.includes('.')) {
				attr.name = attr.name.replaceAll('.', dotReplace);
			}

			if (attr.name.includes('?')) {
				attr.name = attr.name.replaceAll('?', interrogationReplace);
			}
		}

		return attr;
	}
}

/**
 * Format the content of a style tag and print the entire element
 */
async function embedStyle(
	lang: supportedStyleLang | undefined,
	content: string,
	path: AstPath,
	print: printFn,
	textToDoc: TextToDoc,
	options: ParserOptions
): Promise<_doc.builders.Doc | undefined> {
	const isEmpty = /^\s*$/.test(content);

	switch (lang) {
		case 'less':
		case 'css':
		case 'scss': {
			let formattedStyles = await wrapParserTryCatch(textToDoc, content, {
				...options,
				parser: lang,
			});

			// The css parser appends an extra indented hardline, which we want outside of the `indent()`,
			// so we remove the last element of the array
			formattedStyles = stripTrailingHardline(formattedStyles);

			// print
			const attributes = path.map(print, 'attributes');
			const openingTag = group(['<style', indent(group(attributes)), softline, '>']);
			return [
				openingTag,
				indent([isEmpty ? '' : hardline, formattedStyles]),
				isEmpty ? '' : hardline,
				'</style>',
			];
		}
		case 'sass': {
			const lineEnding = options?.endOfLine?.toUpperCase() === 'CRLF' ? 'CRLF' : 'LF';
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
			return [
				openingTag,
				indent([isEmpty ? '' : hardline, formattedSass]),
				isEmpty ? '' : hardline,
				'</style>',
			];
		}
		case undefined: {
			const node = path.getNode();

			if (node) {
				return Buffer.from(options.originalText)
					.subarray(options.locStart(node), options.locEnd(node))
					.toString();
			}

			return undefined;
		}
	}
}
