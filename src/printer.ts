import {
	AstPath as AstP,
	BuiltInParsers,
	Doc,
	ParserOptions as ParserOpts,
	Printer,
} from 'prettier';
import _doc from 'prettier/doc';
const {
	builders: {
		breakParent,
		dedent,
		fill,
		group,
		hardline,
		indent,
		join,
		line,
		literalline,
		softline,
	},
	utils: { removeLines, stripTrailingHardline },
} = _doc;
import { SassFormatter, SassFormatterConfig } from 'sass-formatter';

import { parseSortOrder } from './options';

import {
	RootNode,
	Node,
	AttributeNode,
	CommentNode,
	NodeWithText,
	selfClosingTags,
	TextNode,
	anyNode,
} from './nodes';

type ParserOptions = ParserOpts<anyNode>;
type AstPath = AstP<anyNode>;

import {
	// attachCommentsHTML,
	canOmitSoftlineBeforeClosingTag,
	manualDedent,
	endsWithLinebreak,
	forceIntoExpression,
	formattableAttributes,
	getText,
	getUnencodedText,
	isRootNode,
	// isDocCommand,
	// isEmptyDoc,
	isEmptyTextNode,
	isInlineElement,
	isInsideQuotedAttribute,
	// isLine,
	isLoneMustacheTag,
	// isNodeWithChildren,
	isOrCanBeConvertedToShorthand,
	isPreTagContent,
	isShorthandAndMustBeConvertedToBinaryExpression,
	isTextNode,
	isTextNodeEndingWithWhitespace,
	isTextNodeStartingWithLinebreak,
	isTextNodeStartingWithWhitespace,
	printRaw,
	// replaceEndOfLineWith,
	shouldHugEnd,
	shouldHugStart,
	startsWithLinebreak,
	// trim,
	// trimChildren,
	trimTextNodeLeft,
	trimTextNodeRight,
	getNextNode,
	isTagLikeNode,
} from './utils';

// function printTopLevelParts(node: RootNode, path: AstPath, opts: ParserOptions, print: printFn): Doc {
//   let docs = [];

//   const normalize = (doc: Doc) => [stripTrailingHardline(doc), hardline];

//   // frontmatter always comes first
//   if (node.module) {
//     const subDoc = normalize(path.call(print, 'module'));
//     docs.push(subDoc);
//   }

//   // markup and styles follow, whichever the user prefers (default: markup, styles)
//   for (const section of parseSortOrder(opts.astroSortOrder)) {
//     switch (section) {
//       case 'markup': {
//         const subDoc = path.call(print, 'html');
//         if (!isEmptyDoc(subDoc)) docs.push(normalize(subDoc));
//         break;
//       }
//       case 'styles': {
//         const subDoc = path.call(print, 'css');
//         if (!isEmptyDoc(subDoc)) docs.push(normalize(subDoc));
//         break;
//       }
//     }
//   }

//   return join(softline, docs);
// }

// function printAttributeNodeValue(path: AstPath, print: printFn, quotes: boolean, node: AttributeNode): Doc[] | _doc.builders.Indent {
//   const valueDocs = path.map((childPath) => childPath.call(print), 'value');

//   if (!quotes || !formattableAttributes.includes(node.name)) {
//     return valueDocs;
//   } else {
//     return indent(group(trim(valueDocs, isLine)));
//   }
// }

// TODO: USE ASTPATH GENERIC
// function printJS(path: AstP, print: printFn, name: string, { forceSingleQuote, forceSingleLine }: { forceSingleQuote: boolean; forceSingleLine: boolean }) {
//   path.getValue()[name].isJS = true;
//   path.getValue()[name].forceSingleQuote = forceSingleQuote;
//   path.getValue()[name].forceSingleLine = forceSingleLine;
//   return path.call(print, name);
// }

// TODO: MAYBE USE THIS TO HANDLE COMMENTS
function printComment(commentPath: AstPath, options: ParserOptions): Doc {
	// note(drew): this isn’t doing anything currently, but Prettier requires it anyway
	// @ts-ignore
	return commentPath;
}

export type printFn = (path: AstPath) => Doc;

// eslint-disable-next-line @typescript-eslint/no-shadow
function print(path: AstPath, opts: ParserOptions, print: printFn): Doc {
	const node = path.getValue();
	// const isMarkdownSubDoc = opts.parentParser === 'markdown'; // is this a code block within .md?

	// 1. handle special node types
	if (!node) {
		return '';
	}

	if (typeof node === 'string') {
		return node;
	}

	// if (Array.isArray(node)) {
	//   return path.map((childPath) => childPath.call(print));
	// }

	// if (isASTNode(node)) {
	//   return printTopLevelParts(node, path, opts, print);
	// }

	// 2. attach comments shallowly to children, if any (https://prettier.io/docs/en/plugins.html#manually-attaching-a-comment)
	// if (!isPreTagContent(path) && !isMarkdownSubDoc && node.type === 'Fragment') {
	//   attachCommentsHTML(node);
	// }

	// 3. handle printing
	switch (node.type) {
		case 'root': {
			return [stripTrailingHardline(path.map(print, 'children')), hardline];
		}

		// case 'Fragment': {
		//   const text = getText(node, opts);
		//   if (text.length === 0) {
		//     return '';
		//   }

		//   if (!isNodeWithChildren(node) || node.children.every(isEmptyTextNode)) return '';

		//   if (!isPreTagContent(path)) {
		//     trimChildren(node.children);
		//     const output = trim(
		//       [path.map(print, 'children')],
		//       (n) =>
		//         isLine(n) ||
		//         (typeof n === 'string' && n.trim() === '') ||
		//         // Because printChildren may append this at the end and
		//         // may hide other lines before it
		//         n === breakParent
		//     );
		//     if (output.every((doc) => isEmptyDoc(doc))) {
		//       return '';
		//     }
		//     return group([...output, hardline]);
		//   } else {
		//     return group(path.map(print, 'children'));
		//   }
		// }
		case 'text': {
			const rawText = getUnencodedText(node);

			// TODO: TEST PRE TAGS
			// if (isPreTagContent(path)) {
			//   if (path.getParentNode()?.type === 'Attribute') {
			//     // Direct child of attribute value -> add literallines at end of lines
			//     // so that other things don't break in unexpected places
			//     return replaceEndOfLineWith(rawText, literalline);
			//   }
			//   return rawText;
			// }

			if (isEmptyTextNode(node)) {
				const hasWhiteSpace = rawText.trim().length < getUnencodedText(node).length;
				const hasOneOrMoreNewlines = /\n/.test(getUnencodedText(node));
				const hasTwoOrMoreNewlines = /\n\r?\s*\n\r?/.test(getUnencodedText(node));
				if (hasTwoOrMoreNewlines) {
					return [hardline, hardline];
				}
				if (hasOneOrMoreNewlines) {
					return hardline;
				}
				if (hasWhiteSpace) {
					return line;
				}
				return '';
			}

			/**
			 * For non-empty text nodes each sequence of non-whitespace characters (effectively,
			 * each "word") is joined by a single `line`, which will be rendered as a single space
			 * until this node's current line is out of room, at which `fill` will break at the
			 * most convenient instance of `line`.
			 */
			return fill(splitTextToDocs(node));
		}

		// case 'InlineComponent':
		// case 'Slot':
		case 'component':
		case 'fragment':
		case 'element': {
			// const isEmpty = node.children?.every((child) => isEmptyTextNode(child));
			let isEmpty: boolean;
			if (!node.children) {
				isEmpty = true;
			} else {
				isEmpty = node.children.every((child) => isEmptyTextNode(child));
			}
			const isSelfClosingTag =
				isEmpty && (node.type !== 'element' || selfClosingTags.indexOf(node.name) !== -1);

			const attributes = path.map(print, 'attributes');
			if (isSelfClosingTag) {
				return group(['<', node.name, indent(group(attributes)), line, `/>`]);
				// return group(['<', node.name, indent(group([...attributes, opts.jsxBracketNewLine ? dedent(line) : ''])), ...[opts.jsxBracketNewLine ? '' : ' ', `/>`]]);
			}

			if (node.children) {
				const children = node.children;
				const firstChild = children[0];
				const lastChild = children[children.length - 1];

				// No hugging of content means it's either a block element and/or there's whitespace at the start/end
				let noHugSeparatorStart:
					| _doc.builders.Concat
					| _doc.builders.Line
					| _doc.builders.Softline
					| string = softline;
				let noHugSeparatorEnd:
					| _doc.builders.Concat
					| _doc.builders.Line
					| _doc.builders.Softline
					| string = softline;
				const hugStart = shouldHugStart(node, opts);
				const hugEnd = shouldHugEnd(node, opts);

				let body;

				if (isEmpty) {
					body =
						isInlineElement(path, opts, node) &&
						node.children.length &&
						isTextNodeStartingWithWhitespace(node.children[0]) &&
						!isPreTagContent(path)
							? () => line
							: // () => (opts.jsxBracketNewLine ? '' : softline);
							  () => softline;
				} else if (isPreTagContent(path)) {
					body = () => printRaw(node);
				} else if (isInlineElement(path, opts, node) && !isPreTagContent(path)) {
					body = () => path.map(print, 'children');
				} else {
					body = () => path.map(print, 'children');
				}

				const openingTag = [
					'<',
					node.name,
					indent(
						group([
							...attributes,
							hugStart
								? ''
								: !isPreTagContent(path) && !opts.bracketSameLine
								? dedent(softline)
								: '',
						])
					),
				];
				// const openingTag = ['<', node.name, indent(group([...attributes, hugStart ? '' : opts.jsxBracketNewLine && !isPreTagContent(path) ? dedent(softline) : '']))];

				if (hugStart && hugEnd) {
					const huggedContent = [softline, group(['>', body(), `</${node.name}`])];

					const omitSoftlineBeforeClosingTag =
						isEmpty || canOmitSoftlineBeforeClosingTag(path, opts);
					// const omitSoftlineBeforeClosingTag = (isEmpty && opts.jsxBracketNewLine) || canOmitSoftlineBeforeClosingTag(node, path, opts);
					return group([
						...openingTag,
						isEmpty ? group(huggedContent) : group(indent(huggedContent)),
						omitSoftlineBeforeClosingTag ? '' : softline,
						'>',
					]);
				}

				if (isPreTagContent(path)) {
					noHugSeparatorStart = '';
					noHugSeparatorEnd = '';
				} else {
					let didSetEndSeparator = false;

					if (!hugStart && firstChild && isTextNode(firstChild)) {
						if (
							isTextNodeStartingWithLinebreak(firstChild) &&
							firstChild !== lastChild &&
							(!isInlineElement(path, opts, node) || isTextNodeEndingWithWhitespace(lastChild))
						) {
							noHugSeparatorStart = hardline;
							noHugSeparatorEnd = hardline;
							didSetEndSeparator = true;
						} else if (isInlineElement(path, opts, node)) {
							noHugSeparatorStart = line;
						}
						trimTextNodeLeft(firstChild);
					}
					if (!hugEnd && lastChild && isTextNode(lastChild)) {
						if (isInlineElement(path, opts, node) && !didSetEndSeparator) {
							noHugSeparatorEnd = softline;
						}
						trimTextNodeRight(lastChild);
					}
				}

				if (hugStart) {
					return group([
						...openingTag,
						indent([softline, group(['>', body()])]),
						noHugSeparatorEnd,
						`</${node.name}>`,
					]);
				}

				if (hugEnd) {
					return group([
						...openingTag,
						'>',
						indent([noHugSeparatorStart, group([body(), `</${node.name}`])]),
						canOmitSoftlineBeforeClosingTag(path, opts) ? '' : softline,
						'>',
					]);
				}

				if (isEmpty) {
					return group([...openingTag, '>', body(), `</${node.name}>`]);
				}

				return group([
					...openingTag,
					'>',
					indent([noHugSeparatorStart, body()]),
					noHugSeparatorEnd,
					`</${node.name}>`,
				]);
			}
			// TODO: WIP
			return '';
		}
		// case 'AttributeShorthand': {
		//   return node.expression.name;
		// }
		case 'attribute': {
			const name = node.name.trim();
			const quote = opts.jsxSingleQuote ? "'" : '"';
			switch (node.kind) {
				case 'empty':
					return [line, name];
				case 'expression':
					// HANDLED IN EMBED FUNCION
					return '';
				case 'quoted':
					return [line, name, '=', quote, node.value, quote];
				case 'shorthand':
					return [line, '{', name, '}'];
				case 'spread':
					return [line, '{...', name, '}'];
				case 'template-literal':
					return [line, name, '=', '`', node.value, '`'];
				default:
					break;
			}
			return '';
		}

		case 'doctype': {
			// https://www.w3.org/wiki/Doctypes_and_markup_styles
			return ['<!DOCTYPE html>', hardline];
		}
		// case 'Expression':
		//   // missing test ?
		//   return [];
		// case 'MustacheTag':
		//   return [
		//     '{',
		//     printJS(path, print, 'expression', {
		//       forceSingleLine: isInsideQuotedAttribute(path),
		//       forceSingleQuote: opts.jsxSingleQuote,
		//     }),
		//     '}',
		//   ];
		// case 'Spread':
		//   return [
		//     line,
		//     '{...',
		//     printJS(path, print, 'expression', {
		//       forceSingleQuote: true,
		//       forceSingleLine: false,
		//     }),
		//     '}',
		//   ];
		case 'comment':
			const nextNode = getNextNode(path);
			let trailingLine: _doc.builders.Concat | string = '';
			if (nextNode && isTagLikeNode(nextNode)) {
				trailingLine = hardline;
			}
			return ['<!--', getUnencodedText(node), '-->', trailingLine];
		// case 'CodeSpan':
		//   return getUnencodedText(node);
		// case 'CodeFence': {
		//   console.debug(node);
		//   // const lang = node.metadata.slice(3);
		//   return [node.metadata, hardline, /** somehow call textToDoc(lang),  */ node.data, hardline, '```', hardline];

		//   // We should use `node.metadata` to select a parser to embed with... something like return [node.metadata, hardline textToDoc(node.getMetadataLanguage()), hardline, `\`\`\``];
		// }
		default: {
			throw new Error(`Unhandled node type "${node.type}"!`);
		}
	}
}

/**
 * Split the text into words separated by whitespace. Replace the whitespaces by lines,
 * collapsing multiple whitespaces into a single line.
 *
 * If the text starts or ends with multiple newlines, two of those should be kept.
 */
function splitTextToDocs(node: NodeWithText): Doc[] {
	const text = getUnencodedText(node);

	const textLines = text.split(/[\t\n\f\r ]+/);

	let docs = join(line, textLines).parts.filter((s) => s !== '');

	if (startsWithLinebreak(text)) {
		docs[0] = hardline;
	}
	if (startsWithLinebreak(text, 2)) {
		docs = [hardline, ...docs];
	}

	if (endsWithLinebreak(text)) {
		docs[docs.length - 1] = hardline;
	}
	if (endsWithLinebreak(text, 2)) {
		docs = [...docs, hardline];
	}

	return docs;
}

function expressionParser(text: string, parsers: BuiltInParsers, opts: ParserOptions) {
	const ast = parsers.babel(text, opts);
	// const ast = parsers.babel(text, parsers, opts);

	return {
		...ast,
		program: ast.program.body[0].expression.children[0].expression,
	};
}

function embed(
	path: AstPath,
	// eslint-disable-next-line @typescript-eslint/no-shadow
	print: printFn,
	textToDoc: (text: string, options: object) => Doc,
	opts: ParserOptions
) {
	// TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
	// @ts-ignore
	if (!opts.__astro) opts.__astro = {};

	const node = path.getValue();

	if (!node) return null;

	if (node.type === 'expression') {
		const textContent = printRaw(node);

		let content: Doc;

		content = textToDoc(forceIntoExpression(textContent), {
			...opts,
			parser: expressionParser,
			semi: false,
		});
		content = stripTrailingHardline(content);

		// if (node.children[0].value) {
		//   content = textToDoc(forceIntoExpression(textContent), { parser: expressionParser });
		// } else {
		//   content = textToDoc(forceIntoExpression(node.children[0].value), { parser: expressionParser });
		// }
		return [
			'{',
			// printJS(path, print, 'expression', {
			//   forceSingleLine: isInsideQuotedAttribute(path),
			//   forceSingleQuote: opts.jsxSingleQuote,
			// }),
			content,
			'}',
		];
	}

	// ATTRIBUTE WITH EXPRESSION AS VALUE
	if (node.type === 'attribute' && node.kind === 'expression') {
		const value = node.value.trim();
		const name = node.name.trim();
		let attrNodeValue = textToDoc(forceIntoExpression(value), {
			...opts,
			parser: expressionParser,
			semi: false,
		});
		attrNodeValue = stripTrailingHardline(attrNodeValue);
		// if (Array.isArray(attrNodeValue) && attrNodeValue[0] === ';') {
		//   attrNodeValue = attrNodeValue.slice(1);
		// }
		if (name === value && opts.astroAllowShorthand) {
			return [line, '{', attrNodeValue, '}'];
		}
		return [line, name, '=', '{', attrNodeValue, '}'];
	}

	// TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
	// @ts-ignore
	// if (node.isJS) {
	//   try {
	//     const embeddedopts = {
	//       parser: expressionParser,
	//     };
	//     // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
	//     // @ts-ignore
	//     if (node.forceSingleQuote) {
	//       // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
	//       // @ts-ignore
	//       embeddedopts.singleQuote = true;
	//     }

	//     const docs = textToDoc(forceIntoExpression(getText(node, opts)), embeddedopts);
	//     // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
	//     // @ts-ignore
	//     return node.forceSingleLine ? removeLines(docs) : docs;
	//   } catch (e) {
	//     return getText(node, opts);
	//   }
	// }

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

	// format script element
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
	// if (isTextNode(node)) {
	//   const parent = path.getParentNode();

	//   if (parent && parent.type === 'Element' && parent.name === 'script') {
	//     const formatttedScript = textToDoc(node.data, { ...opts, parser: 'typescript' });
	//     return stripTrailingHardline(formatttedScript);
	//   }
	// }

	// format style element
	if (node.type === 'element' && node.name === 'style') {
		const styleTagContent = printRaw(node);

		const supportedStyleLangValues = ['css', 'scss', 'sass'];
		let parserLang = 'css';

		if (node.attributes) {
			const langAttribute = node.attributes.filter((x) => x.name === 'lang');
			if (langAttribute.length) {
				const styleLang = langAttribute[0].value.toLowerCase();
				if (supportedStyleLangValues.includes(styleLang)) parserLang = styleLang;
			}
		}

		switch (parserLang) {
			case 'css':
			case 'scss': {
				// the css parser appends an extra indented hardline, which we want outside of the `indent()`,
				// so we remove the last element of the array
				let formattedStyles = textToDoc(styleTagContent, {
					...opts,
					parser: parserLang,
				});

				formattedStyles = stripTrailingHardline(formattedStyles);

				// print
				const attributes = path.map(print, 'attributes');
				const openingTag = group(['<style', indent(group(attributes)), softline, '>']);
				return [openingTag, indent([hardline, formattedStyles]), hardline, '</style>'];
			}
			case 'sass': {
				const lineEnding = opts.endOfLine.toUpperCase() === 'CRLF' ? 'CRLF' : 'LF';
				const sassOptions: Partial<SassFormatterConfig> = {
					tabSize: opts.tabWidth,
					insertSpaces: !opts.useTabs,
					lineEnding,
				};

				// dedent the .sass, otherwise SassFormatter gets indentation wrong
				const { result: raw } = manualDedent(styleTagContent);

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

	return null;
}

function hasPrettierIgnore(path: AstP<CommentNode>) {
	// const node = path.getNode();

	// if (!node || !Array.isArray(node.comments)) return false;

	// const hasIgnore = node.comments.some(
	//   (comment: any) => comment.data.includes('prettier-ignore') && !comment.data.includes('prettier-ignore-start') && !comment.data.includes('prettier-ignore-end')
	// );
	// return hasIgnore;
	return false;
}

const printer: Printer = {
	print,
	printComment,
	embed,
	hasPrettierIgnore,
};

export default printer;
