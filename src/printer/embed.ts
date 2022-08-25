import { BuiltInParsers, Doc, ParserOptions } from 'prettier';
import _doc from 'prettier/doc';
import { SassFormatter, SassFormatterConfig } from 'sass-formatter';
import { ExpressionNode } from './nodes';
import {
	AstPath,
	atSignReplace,
	closingBracketReplace,
	dotReplace,
	isNodeWithChildren,
	isTagLikeNode,
	manualDedent,
	openingBracketReplace,
	printFn,
	printRaw,
} from './utils';

const {
	builders: { group, indent, join, line, softline, hardline, lineSuffixBoundary },
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

		content = wrapParserTryCatch(textToDoc, forceIntoExpression(textContent), {
			...opts,
			parser: expressionParser,
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
				doc = doc.replace(openingBracketReplace, '{');
				doc = doc.replace(closingBracketReplace, '}');
				doc = doc.replace(atSignReplace, '@');
				doc = doc.replace(dotReplace, '.');
			}

			return doc;
		});

		return group(['{', indent([softline, astroDoc]), softline, lineSuffixBoundary, '}']);
	}

	// Attribute using an expression as value
	if (node.type === 'attribute' && node.kind === 'expression') {
		const value = node.value.trim();
		const name = node.name.trim();

		const attrNodeValue = wrapParserTryCatch(textToDoc, forceIntoExpression(value), {
			...opts,
			parser: expressionParser,
		});

		if (name === value && opts.astroAllowShorthand) {
			return [line, '{', attrNodeValue, '}'];
		}

		return [line, name, '=', '{', attrNodeValue, '}'];
	}

	// Frontmatter
	if (node.type === 'frontmatter') {
		const frontmatterContent = wrapParserTryCatch(textToDoc, node.value, {
			...opts,
			parser: 'typescript',
		});

		return [group(['---', hardline, frontmatterContent, '---', hardline]), hardline];
	}

	// Script tags
	if (node.type === 'element' && node.name === 'script') {
		const scriptContent = printRaw(node);
		let formattedScript = wrapParserTryCatch(textToDoc, scriptContent, {
			...opts,
			parser: 'typescript',
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

function wrapParserTryCatch(
	cb: (text: string, options: object) => Doc,
	text: string,
	options: ParserOptions
) {
	try {
		return cb(text, options);
	} catch (e) {
		// If we couldn't parse the expression (ex: syntax error) and we throw here, Prettier fallback to `print` and we'll
		// get a totally useless error message (ex: unhandled node type). An undocumented way to work around this is to set
		// `PRETTIER_DEBUG=1`, but nobody know that exists / want to do that just to get useful error messages. So we force it on
		process.env.PRETTIER_DEBUG = 'true';
		throw e;
	}
}

function forceIntoExpression(statement: string) {
	// note the trailing newline: if the statement ends in a // comment,
	// we can't add the closing bracket right afterwards
	return `<>{${statement}\n}</>`;
}

function expressionParser(text: string, parsers: BuiltInParsers, options: ParserOptions) {
	const ast = parsers['babel-ts'](text, options);

	return {
		...ast,
		program: ast.program.body[0].expression.children[0].expression,
	};
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

	if (isNodeWithChildren(newNode)) {
		newNode.children.forEach((child) => {
			if (isTagLikeNode(child)) {
				child.attributes.forEach((attr) => {
					// Transform shorthand attributes into an empty attribute, ex: `{shorthand}` becomes `shorthand` and wrap it
					// so we can transform it back into {}
					if (attr.kind === 'shorthand') {
						attr.kind = 'empty';
						attr.name = openingBracketReplace + attr.name + closingBracketReplace;
					}

					if (attr.name.includes('@')) {
						attr.name = attr.name.replace('@', atSignReplace);
					}

					if (attr.name.includes('.')) {
						attr.name = attr.name.replace('.', dotReplace);
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
			let formattedStyles = wrapParserTryCatch(textToDoc, content, { ...options, parser: lang });

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
