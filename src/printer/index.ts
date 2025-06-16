import { type Doc } from 'prettier';
import { selfClosingTags } from './elements';
import { type TextNode } from './nodes';
import {
	canOmitSoftlineBeforeClosingTag,
	endsWithLinebreak,
	getNextNode,
	getPreferredQuote,
	getUnencodedText,
	hasSetDirectives,
	isBreakChildrenElement,
	isEmptyTextNode,
	isIgnoreDirective,
	isInlineElement,
	isPreTagContent,
	isTagLikeNode,
	isTextNode,
	isTextNodeEndingWithWhitespace,
	isTextNodeStartingWithLinebreak,
	isTextNodeStartingWithWhitespace,
	printClassNames,
	printRaw,
	shouldHugEnd,
	shouldHugStart,
	startsWithLinebreak,
	trimTextNodeLeft,
	trimTextNodeRight,
	type AstPath,
	type ParserOptions,
	type printFn,
} from './utils';

import _doc from 'prettier/doc';
const {
	builders: {
		breakParent,
		dedent,
		fill,
		group,
		indent,
		join,
		line,
		softline,
		hardline,
		literalline,
	},
	utils: { stripTrailingHardline },
} = _doc;

let ignoreNext = false;

// https://prettier.io/docs/en/plugins.html#print
// eslint-disable-next-line @typescript-eslint/no-shadow
export function print(path: AstPath, opts: ParserOptions, print: printFn): Doc {
	const node = path.node;

	// 1. handle special node types
	if (!node) {
		return '';
	}

	if (ignoreNext && !isEmptyTextNode(node)) {
		ignoreNext = false;
		return [
			opts.originalText
				.slice(opts.locStart(node), opts.locEnd(node))
				.split('\n')
				.map((lineContent, i) => (i == 0 ? [lineContent] : [literalline, lineContent]))
				.flat(),
		];
	}

	if (typeof node === 'string') {
		return node;
	}

	// 2. handle printing
	switch (node.type) {
		case 'root': {
			return [stripTrailingHardline(path.map(print, 'children')), hardline];
		}

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
				const hasOneOrMoreNewlines = getUnencodedText(node).includes('\n');
				const hasTwoOrMoreNewlines = /\n\s*\n\r?/.test(getUnencodedText(node));
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

		case 'component':
		case 'fragment':
		case 'custom-element':
		case 'element': {
			let isEmpty: boolean;
			if (!node.children) {
				isEmpty = true;
			} else {
				isEmpty = node.children.every((child) => isEmptyTextNode(child));
			}

			/**
			 * An element is allowed to self close only if:
			 * It is empty AND
			 *  It's a component OR
			 *  It's in the HTML spec as a void element OR
			 *  It has a `set:*` directive
			 */
			const isSelfClosingTag =
				isEmpty &&
				(node.type === 'component' ||
					selfClosingTags.includes(node.name) ||
					hasSetDirectives(node));

			const isSingleLinePerAttribute = opts.singleAttributePerLine && node.attributes.length > 1;
			const attributeLine = isSingleLinePerAttribute ? breakParent : '';
			const attributes = join(attributeLine, path.map(print, 'attributes'));

			if (isSelfClosingTag) {
				return group(['<', node.name, indent(attributes), line, `/>`]);
			}

			if (node.children) {
				const children = node.children;
				const firstChild = children[0];
				const lastChild = children[children.length - 1];

				// No hugging of content means it's either a block element and/or there's whitespace at the start/end
				let noHugSeparatorStart:
					| _doc.builders.Line
					| _doc.builders.Softline
					| _doc.builders.Hardline
					| string = softline;
				let noHugSeparatorEnd:
					| _doc.builders.Line
					| _doc.builders.Softline
					| _doc.builders.Hardline
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
							: () => softline;
				} else if (isPreTagContent(path)) {
					body = () => printRaw(node);
				} else if (isInlineElement(path, opts, node) && !isPreTagContent(path)) {
					body = () => path.map(print, 'children');
				} else if (isBreakChildrenElement(node)) {
					body = () => [breakParent, ...path.map(print, 'children')];
				} else {
					body = () => path.map(print, 'children');
				}

				const openingTag = [
					'<',
					node.name,
					indent(
						group([
							attributes,
							hugStart
								? ''
								: !isPreTagContent(path) && !opts.bracketSameLine
									? dedent(softline)
									: '',
						]),
					),
				];

				if (hugStart && hugEnd) {
					const huggedContent = [
						isSingleLinePerAttribute ? hardline : softline,
						group(['>', body(), `</${node.name}`]),
					];

					const omitSoftlineBeforeClosingTag =
						isEmpty || canOmitSoftlineBeforeClosingTag(path, opts);
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
							noHugSeparatorEnd = line;
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

		case 'attribute': {
			const name = node.name.trim();
			switch (node.kind) {
				case 'empty':
					return [line, name];
				case 'expression':
					// Handled in the `embed` function
					// See embed.ts
					return '';
				case 'quoted':
					let value = node.value;

					if (node.name === 'class') {
						value = printClassNames(value);
					}

					const unescapedValue = value.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
					const { escaped, quote, regex } = getPreferredQuote(
						unescapedValue,
						opts.jsxSingleQuote ? "'" : '"',
					);

					const result = unescapedValue.replace(regex, escaped);
					return [line, name, '=', quote, result, quote];
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
			return ['<!doctype html>', hardline];
		}

		case 'comment':
			if (isIgnoreDirective(node)) {
				ignoreNext = true;
			}

			const nextNode = getNextNode(path);
			let trailingLine: string | _doc.builders.Hardline = '';
			if (nextNode && isTagLikeNode(nextNode)) {
				trailingLine = hardline;
			}
			return ['<!--', getUnencodedText(node), '-->', trailingLine];

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
function splitTextToDocs(node: TextNode): Doc[] {
	const text = getUnencodedText(node);

	const textLines = text.split(/[\t\n\f\r ]+/);

	let docs = join(line, textLines).filter((doc) => doc !== '');

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
