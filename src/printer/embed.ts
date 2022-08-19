import { Doc, ParserOptions } from 'prettier';
import _doc from 'prettier/doc.js';
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
	builders: { group, indent, join, line, softline, hardline, lineSuffixBoundary },
	utils: { stripTrailingHardline, mapDoc },
} = _doc;

type supportedStyleLang = 'css' | 'scss' | 'sass';

// https://prettier.io/docs/en/plugins.html#optional-embed
type Embed =
	| ((
			// Parses and prints the passed text using a different parser.
			// You should set `options.parser` to specify which parser to use.
			textToDoc: TextToDoc,
			// Prints the current node or its descendant node with the current printer
			print: printFn,
			// The following two arguments are passed for convenience.
			// They're the same `path` and `options` that are passed to `embed`.
			path: AstPath,
			options: ParserOptions
	  ) => Promise<Doc | undefined> | Doc | undefined)
	| Doc
	| undefined;

type TextToDoc = (text: string, options: ParserOptions) => Promise<Doc>;

// https://prettier.io/docs/en/plugins.html#optional-embed
export function embed(path: AstPath, opts: ParserOptions): Embed {
	return async (textToDoc, print) => {
		const node = path.getValue();

		if (!node) return;

		if (node.type === 'expression') {
			const jsxNode = makeNodeJSXCompatible<ExpressionNode>(node);
			const textContent = printRaw(jsxNode);

			let content: Doc;

			try {
				content = await textToDoc(textContent, {
					...opts,
					parser: '__js_expression',
				});
			} catch (e) {
				// The `__js_expression` parser should be able to handle 99% of supported expressions, however there's some very rare cases
				// where we unfortunately need the full `babel-ts` parser. This happens notably with comments. In the future, what
				// we should probably attempt is to make the expression compatible with `__js_expression` through our `makeNodeJSXCompatible` function
				content = await wrapParserTryCatch(textToDoc, textContent, {
					...opts,
					parser: 'babel-ts',
				});

				// content = stripTrailingHardline(content);

				// HACK: We can't strip the trailing hardline if an expression starts with an inline comment or the ending curly
				// bracket will end on the same line as the comment, which breaks the expression
				if (textContent.trimStart().startsWith('//') && /\n/.test(textContent)) {
					return group(['{', indent([hardline, content]), hardline, lineSuffixBoundary, '}']);
				}
			}

			// Create a Doc without the things we had to add to make the expression compatible with Babel
			const astroDoc = mapDoc(content, (doc) => {
				if (typeof doc === 'string') {
					doc = doc.replace('_Pé', '{');
					doc = doc.replace('èP_', '}');
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
				...opts,
				parser: '__js_expression',
			});

			if (name === value && opts.astroAllowShorthand) {
				return [line, '{', attrNodeValue, '}'];
			}

			return [line, name, '=', '{', attrNodeValue, '}'];
		}

		// Frontmatter
		if (node.type === 'frontmatter') {
			const frontmatterContent = await wrapParserTryCatch(textToDoc, node.value, {
				...opts,
				parser: 'typescript',
			});

			return [group(['---', hardline, frontmatterContent, hardline, '---', hardline]), hardline];
		}

		// Script tags
		if (node.type === 'element' && node.name === 'script') {
			const scriptContent = printRaw(node);
			const formattedScript = await wrapParserTryCatch(textToDoc, scriptContent, {
				...opts,
				parser: 'typescript',
			});

			// formattedScript = stripTrailingHardline(formattedScript);
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

			return await embedStyle(parserLang, content, path, print, textToDoc, opts);
		}

		return;
	};
}

async function wrapParserTryCatch(cb: TextToDoc, text: string, options: ParserOptions) {
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
					// Transform shorthand attributes into a form that is both compatible with JSX and that we can find back
					if (attr.kind === 'shorthand') {
						attr.kind = 'empty';
						attr.name = '_Pé' + attr.name + 'èP_';
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

/**
 * Format the content of a style tag and print the entire element
 */
async function embedStyle(
	lang: supportedStyleLang,
	content: string,
	path: AstPath,
	print: printFn,
	textToDoc: TextToDoc,
	options: ParserOptions
) {
	switch (lang) {
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
