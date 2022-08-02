import { BuiltInParsers, Doc, ParserOptions } from 'prettier';
import _doc from 'prettier/doc';
import { SassFormatter, SassFormatterConfig } from 'sass-formatter';
import { AstPath, manualDedent, printFn, printRaw } from './utils';
const {
	builders: { group, indent, join, line, softline, hardline },
	utils: { stripTrailingHardline },
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
		const textContent = printRaw(node);

		let content: Doc;

		content = textToDoc(forceIntoExpression(textContent), {
			...opts,
			parser: expressionParser,
		});
		content = stripTrailingHardline(content);

		return ['{', content, '}'];
	}

	// Attribute using an expression as value
	if (node.type === 'attribute' && node.kind === 'expression') {
		const value = node.value.trim();
		const name = node.name.trim();
		let attrNodeValue = textToDoc(forceIntoExpression(value), {
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
	const ast = parsers.babel(text, opts);

	return {
		...ast,
		program: ast.program.body[0].expression.children[0].expression,
	};
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
