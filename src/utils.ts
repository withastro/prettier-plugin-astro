import { AstPath as AstP, doc, Doc, ParserOptions as ParserOpts, util } from 'prettier';

import {
	anyNode,
	Node,
	RootNode,
	AttributeNode,
	ElementNode,
	ComponentNode,
	CustomElementNode,
	ExpressionNode,
	TextNode,
	FrontmatterNode,
	DoctypeNode,
	CommentNode,
	NodeWithText,
	blockElements,
	// attributeValue,
	BlockElementNode,
	InlineElementNode,
	// MustacheTagNode,
	NodeWithChildren,
	TagLikeNode,
	// NodeWithText,
	// TextNode,
} from './nodes';

import { createSyncFn } from 'synckit';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// the worker path must be absolute
const serialize = createSyncFn(require.resolve('../workers/serialize-worker.js'));

type ParserOptions = ParserOpts<anyNode>;
type AstPath = AstP<anyNode>;

/**
 * HTML attributes that we may safely reformat (trim whitespace, add or remove newlines)
 */
export const formattableAttributes: string[] = [
	// None at the moment
	// Prettier HTML does not format attributes at all
	// and to be consistent we leave this array empty for now
];

// const rootNodeKeys = new Set(['html', 'css', 'module']);

// const isSync = makeSynchronous(async (node: anyNode) => {
//   const dynamicImport = new Function('file', 'return import(file)');
//   const { is } = await dynamicImport('@astrojs/compiler/utils');
//   try {
//     return await is(node);
//   } catch (e) {
//     console.error(e);
//   }
// });

// export const is = (node: anyNode) => isSync(node);

export const isRootNode = (node: anyNode): node is RootNode => node.type === 'root';

export const isEmptyTextNode = (node: Node): boolean => {
	return !!node && node.type === 'text' && getUnencodedText(node).trim() === '';
};

export const isPreTagContent = (path: AstPath): boolean => {
	if (!path || !path.stack || !Array.isArray(path.stack)) return false;
	return path.stack.some(
		(node: anyNode) =>
			(node.type === 'element' && node.name.toLowerCase() === 'pre') ||
			(node.type === 'attribute' && !formattableAttributes.includes(node.name))
	);
};

export function isLoneMustacheTag(node: AttributeNode): boolean {
	// export function isLoneMustacheTag(node: AttributeNode): node is [MustacheTagNode] {
	return node.kind === 'expression';
	// return node !== true && node.length === 1 && node[0].type === 'MustacheTag';
}

// function isAttributeShorthand(node: attributeValue): node is [AttributeShorthandNode] {
//   return node !== true && node.length === 1 && node[0].type === 'AttributeShorthand';
// }

/**
 * True if node is of type `{a}` or `a={a}`
 */
export function isOrCanBeConvertedToShorthand(node: AttributeNode, opts: ParserOptions): boolean {
	if (!opts.astroAllowShorthand) return false;
	if (node.kind === 'shorthand') {
		return true;
	}
	// if (isAttributeShorthand(node.value)) {
	//   return true;
	// }

	if (node.value.trim() === node.name.trim()) {
		return true;
	}

	// if (isLoneMustacheTag(node.value)) {
	//   const expression = node.value[0].expression;
	//   return expression.codeChunks[0].trim() === node.name;
	//   // return (expression.type === 'Identifier' && expression.name === node.name) || (expression.type === 'Expression' && expression.codeChunks[0] === node.name);
	// }

	return false;
}

/**
 *  True if node is of type `{a}` and astroAllowShorthand is false
 */
export function isShorthandAndMustBeConvertedToBinaryExpression(
	node: AttributeNode,
	opts: ParserOptions
): boolean {
	if (opts.astroAllowShorthand) return false;
	if (node.type === 'attribute' && node.kind === 'shorthand') {
		return true;
	}
	// if (isAttributeShorthand(node.value)) {
	//   return true;
	// }
	return false;
}

// export function flatten<T>(arrays: T[][]): T[] {
//   return ([] as T[]).concat.apply([], arrays);
// }

// TODO: TEST IF IT'S GETTING THE CORRECT TEXT
export function getText(node: anyNode, opts: ParserOptions): string {
	if (!node.position) return '';
	return opts.originalText.slice(node.position.start.offset + 1, node.position.end?.offset);
	// return opts.originalText.slice(opts.locStart(node), opts.locEnd(node));
}

export function getUnencodedText(node: NodeWithText): string {
	return node.value;
}

// export function replaceEndOfLineWith(text: string, replacement: doc.builders.DocCommand): Doc[] {
//   const parts = [];
//   for (const part of text.split('\n')) {
//     if (parts.length > 0) {
//       parts.push(replacement);
//     }
//     if (part.endsWith('\r')) {
//       parts.push(part.slice(0, -1));
//     } else {
//       parts.push(part);
//     }
//   }
//   return parts;
// }

/**
 *  Returns the content of the node
 */
export function printRaw(node: anyNode, stripLeadingAndTrailingNewline = false): string {
	if (!isNodeWithChildren(node)) {
		return '';
	}

	if (node.children.length === 0) {
		return '';
	}

	let raw = node.children.reduce((prev: string, curr: Node) => prev + serialize(curr), '');

	if (!stripLeadingAndTrailingNewline) {
		return raw;
	}

	if (startsWithLinebreak(raw)) {
		raw = raw.substring(raw.indexOf('\n') + 1);
	}
	if (endsWithLinebreak(raw)) {
		raw = raw.substring(0, raw.lastIndexOf('\n'));
		if (raw.charAt(raw.length - 1) === '\r') {
			raw = raw.substring(0, raw.length - 1);
		}
	}

	return raw;
}

export function isNodeWithChildren(node: anyNode): node is anyNode & NodeWithChildren {
	return node && 'children' in node && Array.isArray(node.children);
}

export function isInlineElement(
	path: AstPath,
	opts: ParserOptions,
	node: anyNode
): node is InlineElementNode {
	return node && node.type === 'element' && !isBlockElement(node, opts) && !isPreTagContent(path);
}

export function isBlockElement(node: anyNode, opts: ParserOptions): node is BlockElementNode {
	return (
		node &&
		node.type === 'element' &&
		opts.htmlWhitespaceSensitivity !== 'strict' &&
		(opts.htmlWhitespaceSensitivity === 'ignore' || blockElements.includes(node.name))
	);
}

export function isTextNodeStartingWithLinebreak(node: TextNode, nrLines = 1): node is TextNode {
	return startsWithLinebreak(getUnencodedText(node), nrLines);
	// return node.type === 'Text' && startsWithLinebreak(getUnencodedText(node), nrLines);
}

export function startsWithLinebreak(text: string, nrLines = 1): boolean {
	return new RegExp(`^([\\t\\f\\r ]*\\n){${nrLines}}`).test(text);
}

// export function isTextNodeEndingWithLinebreak(node: TextNode, nrLines: number = 1) {
//   return node.type === 'text' && endsWithLinebreak(getUnencodedText(node), nrLines);
// }

export function endsWithLinebreak(text: string, nrLines = 1): boolean {
	return new RegExp(`(\\n[\\t\\f\\r ]*){${nrLines}}$`).test(text);
}

export function isTextNodeStartingWithWhitespace(node: Node): node is TextNode {
	return node.type === 'text' && /^\s/.test(getUnencodedText(node));
}

export function isTextNodeEndingWithWhitespace(node: Node): node is TextNode {
	return node.type === 'text' && /\s$/.test(getUnencodedText(node));
}

export function forceIntoExpression(statement: string): string {
	// note the trailing newline: if the statement ends in a // comment,
	// we can't add the closing bracket right afterwards
	return `<>{${statement}\n}</>`;
}

/**
 * Check if given node's starg tag should hug its first child. This is the case for inline elements when there's
 * no whitespace between the `>` and the first child.
 */
export function shouldHugStart(node: anyNode, opts: ParserOptions): boolean {
	if (isBlockElement(node, opts)) {
		return false;
	}

	if (!isNodeWithChildren(node)) {
		return false;
	}

	const children = node.children;
	if (children.length === 0) {
		return true;
	}

	const firstChild = children[0];
	return !isTextNodeStartingWithWhitespace(firstChild);
}

/**
 * Check if given node's end tag should hug its last child. This is the case for inline elements when there's
 * no whitespace between the last child and the `</`.
 */
export function shouldHugEnd(node: anyNode, opts: ParserOptions): boolean {
	if (isBlockElement(node, opts)) {
		return false;
	}

	if (!isNodeWithChildren(node)) {
		return false;
	}

	const children = node.children;
	if (children.length === 0) {
		return true;
	}

	return false;

	// TODO: WIP
	// const lastChild = children[children.length - 1];
	// return !isTextNodeEndingWithWhitespace(lastChild);
}

/**
 * Returns true if the softline between `</tagName` and `>` can be omitted.
 */
export function canOmitSoftlineBeforeClosingTag(path: AstPath, opts: ParserOptions): boolean {
	return isLastChildWithinParentBlockElement(path, opts);
	// return !hugsStartOfNextNode(node, options) || isLastChildWithinParentBlockElement(path, options);
	// return !options.svelteBracketNewLine && (!hugsStartOfNextNode(node, options) || isLastChildWithinParentBlockElement(path, options));
}

/**
 * Return true if given node does not hug the next node, meaning there's whitespace
 * or the end of the doc afterwards.
 */
// function hugsStartOfNextNode(node: anyNode, opts: ParserOptions): boolean {
//   if (node.end === opts.originalText.length) {
//     // end of document
//     return false;
//   }

//   return !opts.originalText.substring(node.end).match(/^\s/);
// }

function getChildren(node: anyNode): Node[] {
	return isNodeWithChildren(node) ? node.children : [];
}

function isLastChildWithinParentBlockElement(path: AstPath, opts: ParserOptions): boolean {
	const parent = path.getParentNode();
	if (!parent || !isBlockElement(parent, opts)) {
		return false;
	}

	const children = getChildren(parent);
	const lastChild = children[children.length - 1];
	return lastChild === path.getNode();
}

export function trimTextNodeLeft(node: TextNode): void {
	node.value = node.value && node.value.trimStart();
}

export function trimTextNodeRight(node: TextNode): void {
	node.value = node.value && node.value.trimEnd();
}

// export function findLastIndex<T>(isMatch: (item: T, idx: number) => boolean, items: T[]) {
//   for (let i = items.length - 1; i >= 0; i--) {
//     if (isMatch(items[i], i)) {
//       return i;
//     }
//   }

//   return -1;
// }

/**
 * Remove all leading whitespace up until the first non-empty text node,
 * and all trailing whitepsace from the last non-empty text node onwards.
 */
// export function trimChildren(children: anyNode[]) {
//   // export function trimChildren(children: anyNode[], path: AstPath<anyNode>) {
//   let firstNonEmptyNode = children.findIndex((n) => !isEmptyTextNode(n));
//   // let firstNonEmptyNode = children.findIndex((n) => !isEmptyTextNode(n) && !doesEmbedStartAfterNode(n, path));
//   firstNonEmptyNode = firstNonEmptyNode === -1 ? children.length - 1 : firstNonEmptyNode;

//   let lastNonEmptyNode = findLastIndex((n, idx) => {
//     // Last node is ok to end at the start of an embedded region,
//     // if it's not a comment (which should stick to the region)
//     return !isEmptyTextNode(n);
//     // return !isEmptyTextNode(n) && ((idx === children.length - 1 && n.type !== 'Comment') || !doesEmbedStartAfterNode(n, path));
//   }, children);
//   lastNonEmptyNode = lastNonEmptyNode === -1 ? 0 : lastNonEmptyNode;

//   for (let i = 0; i <= firstNonEmptyNode; i++) {
//     const n = children[i];
//     if (isTextNode(n)) {
//       trimTextNodeLeft(n);
//     }
//   }

//   for (let i = children.length - 1; i >= lastNonEmptyNode; i--) {
//     const n = children[i];
//     if (isTextNode(n)) {
//       trimTextNodeRight(n);
//     }
//   }
// }

/**
 * Returns siblings, that is, the children of the parent.
 */
// export function getSiblings(path: AstPath): anyNode[] {
//   let parent = path.getParentNode();
//   if (!parent) return [];

//   if (isRootNode(parent)) {
//     parent = parent.html;
//   }

//   return getChildren(parent);
// }

/**
 * Did there use to be any embedded object (that has been snipped out of the AST to be moved)
 * at the specified position?
 */
// function doesEmbedStartAfterNode(node: anyNode, path: AstPath<anyNode>, siblings = getSiblings(path)): boolean {
//   // If node is not at the top level of html, an embed cannot start after it,
//   // because embeds are only at the top level
//   if (!isNodeTopLevelHTML(node, path)) {
//     return false;
//   }

//   const position = node.end;
//   const root = path.stack[0];

//   const embeds = [root.module, root.html, root.css];

//   const nextNode = siblings[siblings.indexOf(node) + 1];
//   return embeds.find((n) => n && n.start >= position && (!nextNode || n.end <= nextNode.start));
// }

// function isNodeTopLevelHTML(node: anyNode, path: AstPath<anyNode>) {
//   const root = path.stack[0];
//   return !!root.html && !!root.html.children && root.html.children.includes(node);
// }

/**
 * Check if doc is a hardline.
 * We can't just rely on a simple equality check because the doc could be created with another
 * runtime version of prettier than what we import, making a reference check fail.
 */

// function isHardline(docToCheck: Doc): boolean {
//   return docToCheck === doc.builders.hardline || deepEqual(docToCheck, doc.builders.hardline);
// }

/**
 * Simple deep equal function which suits our needs. Only works properly on POJOs without cyclic deps.
 */
// function deepEqual(x: any, y: any): boolean {
//   if (x === y) {
//     return true;
//   } else if (typeof x == 'object' && x != null && typeof y == 'object' && y != null) {
//     if (Object.keys(x).length != Object.keys(y).length) return false;

//     for (var prop in x) {
//       if (Object.prototype.hasOwnProperty.call(y, prop)) {
//         if (!deepEqual(x[prop], y[prop])) return false;
//       } else {
//         return false;
//       }
//     }

//     return true;
//   } else {
//     return false;
//   }
// }

// export function isLine(docToCheck: Doc): boolean {
//   return (
//     isHardline(docToCheck) ||
//     (typeof docToCheck === 'object' && isDocCommand(docToCheck) && docToCheck.type === 'line') ||
//     (typeof docToCheck === 'object' && isDocCommand(docToCheck) && docToCheck.type === 'concat' && docToCheck.parts.every(isLine))
//   );
// }

/**
 * Check if the doc is empty, i.e. consists of nothing more than empty strings (possibly nested).
 */
// export function isEmptyDoc(doc: Doc): boolean {
//   if (typeof doc === 'string') {
//     return doc.length === 0;
//   }

//   // if (doc.type === 'line') {
//   //   return !doc.keepIfLonely;
//   // }

//   // Since Prettier 2.3.0, concats are represented as flat arrays
//   if (Array.isArray(doc)) {
//     return doc.length === 0;
//   }

//   // const { contents } = doc;

//   // if (contents) {
//   //   return isEmptyDoc(contents);
//   // }

//   // const { parts } = doc;

//   // if (parts) {
//   //   return isEmptyGroup(parts);
//   // }

//   return false;
// }

// function isEmptyGroup(group: any) {
//   return !group.find((doc: any) => !isEmptyDoc(doc));
// }

/**
 * Trims both leading and trailing nodes matching `isWhitespace` independent of nesting level
 * (though all trimmed adjacent nodes need to be a the same level). Modifies the `docs` array.
 */
// export function trim(docs: Doc[], isWhitespace: (doc: Doc) => boolean): Doc[] {
//   trimLeft(docs, isWhitespace);
//   trimRight(docs, isWhitespace);

//   return docs;
// }

/**
 * Trims the leading nodes matching `isWhitespace` independent of nesting level (though all nodes need to be a the same level).
 * If there are empty docs before the first whitespace, they are removed, too.
 */
// function trimLeft(group: Doc[], isWhitespace: (doc: Doc) => boolean): void {
//   let firstNonWhitespace = group.findIndex((doc) => !isEmptyDoc(doc) && !isWhitespace(doc));

//   if (firstNonWhitespace < 0 && group.length) {
//     firstNonWhitespace = group.length;
//   }

//   if (firstNonWhitespace > 0) {
//     const removed = group.splice(0, firstNonWhitespace);
//     if (removed.every(isEmptyDoc)) {
//       return trimLeft(group, isWhitespace);
//     }
//   } else {
//     const parts = getParts(group[0]);

//     if (parts) {
//       return trimLeft(parts, isWhitespace);
//     }
//   }
// }

/**
 * Trims the trailing nodes matching `isWhitespace` independent of nesting level (though all nodes need to be a the same level).
 * If there are empty docs after the last whitespace, they are removed, too.
 */
// function trimRight(group: Doc[], isWhitespace: (doc: Doc) => boolean): void {
//   let lastNonWhitespace = group.length ? findLastIndex((doc: any) => !isEmptyDoc(doc) && !isWhitespace(doc), group) : 0;

//   if (lastNonWhitespace < group.length - 1) {
//     const removed = group.splice(lastNonWhitespace + 1);
//     if (removed.every(isEmptyDoc)) {
//       return trimRight(group, isWhitespace);
//     }
//   } else {
//     const parts = getParts(group[group.length - 1]);

//     if (parts) {
//       return trimRight(parts, isWhitespace);
//     }
//   }
// }

// function getParts(doc: Doc): Doc[] | undefined {
//   if (typeof doc === 'object') {
//     // Since Prettier 2.3.0, concats are represented as flat arrays
//     if (Array.isArray(doc)) {
//       return doc;
//     }
//     if (doc.type === 'fill' || doc.type === 'concat') {
//       return doc.parts;
//     }
//     if (doc.type === 'group') {
//       return getParts(doc.contents);
//     }
//   }
// }

// export const isObjEmpty = (obj: object): boolean => {
//   for (let i in obj) return false;
//   return true;
// };

/** Shallowly attach comments to children */
// export function attachCommentsHTML(node: anyNode): void {
//   if (!isNodeWithChildren(node) || !node.children.some(({ type }) => type === 'Comment')) return;

//   const nodesToRemove = [];

//   // note: the .length - 1 is because we don’t need to read the last node
//   for (let n = 0; n < node.children.length - 1; n++) {
//     if (!node.children[n]) continue;

//     // attach comment to the next non-whitespace node
//     if (node.children[n].type === 'Comment') {
//       let next = n + 1;
//       while (isEmptyTextNode(node.children[next])) {
//         nodesToRemove.push(next); // if arbitrary whitespace between comment and node, remove
//         next++; // skip to the next non-whitespace node
//       }
//       const commentNode = node.children[next];
//       if (commentNode) {
//         const comment = node.children[n];
//         util.addLeadingComment(commentNode, comment);
//       }
//     }
//   }

//   // remove arbitrary whitespace nodes
//   nodesToRemove.reverse(); // start at back so we aren’t changing indices
//   nodesToRemove.forEach((index) => {
//     node.children.splice(index, 1);
//   });
// }

/** dedent string & return tabSize (the last part is what we need) */
export function manualDedent(input: string): {
	tabSize: number;
	char: string;
	result: string;
} {
	let minTabSize = Infinity;
	let result = input;
	// 1. normalize
	result = result.replace(/\r\n/g, '\n');

	// 2. count tabSize
	let char = '';
	for (const line of result.split('\n')) {
		if (!line) continue;
		// if any line begins with a non-whitespace char, minTabSize is 0
		if (line[0] && /^[^\s]/.test(line[0])) {
			minTabSize = 0;
			break;
		}
		const match = line.match(/^(\s+)\S+/); // \S ensures we don’t count lines of pure whitespace
		if (match) {
			if (match[1] && !char) char = match[1][0];
			if (match[1].length < minTabSize) minTabSize = match[1].length;
		}
	}

	// 3. reformat string
	if (minTabSize > 0 && Number.isFinite(minTabSize)) {
		result = result.replace(new RegExp(`^${new Array(minTabSize + 1).join(char)}`, 'gm'), '');
	}

	return {
		tabSize: minTabSize === Infinity ? 0 : minTabSize,
		char,
		result,
	};
}

/** re-indent string by chars */
// export function indent(input: string, char: string = ' '): string {
//   return input.replace(/^(.)/gm, `${char}$1`);
// }

/** scan code for Markdown name(s) */
export function getMarkdownName(script: string): Set<string> {
	// default import: could be named anything
	let defaultMatch;
	while (
		(defaultMatch = /import\s+([^\s]+)\s+from\s+['|"|`]astro\/components\/Markdown\.astro/g.exec(
			script
		))
	) {
		if (defaultMatch[1]) return new Set([defaultMatch[1].trim()]);
	}

	// named component: must have "Markdown" in specifier, but can be renamed via "as"
	let namedMatch;
	while ((namedMatch = /import\s+\{\s*([^}]+)\}\s+from\s+['|"|`]astro\/components/g.exec(script))) {
		if (namedMatch[1] && !namedMatch[1].includes('Markdown')) continue;
		// if "Markdown" was imported, find out whether or not it was renamed
		const rawImports = namedMatch[1].trim().replace(/^\{/, '').replace(/\}$/, '').trim();
		let importName = 'Markdown';
		for (const spec of rawImports.split(',')) {
			const [original, renamed] = spec.split(' as ').map((s) => s.trim());
			if (original !== 'Markdown') continue;
			importName = renamed || original;
			break;
		}
		return new Set([importName]);
	}
	return new Set(['Markdown']);
}

// TODO: USE THE COMPILER
/** True if the node is of type text */
export function isTextNode(node: anyNode): node is TextNode {
	return node.type === 'text';
}

// export function isMustacheNode(node: anyNode): node is MustacheTagNode {
//   return node.type === 'MustacheTag';
// }

// export function isDocCommand(doc: Doc): doc is doc.builders.DocCommand {
//   if (typeof doc === 'string') return false;
//   if (Array.isArray(doc)) return false;
//   return true;
// }

export function isInsideQuotedAttribute(path: AstPath): boolean {
	const stack = path.stack as anyNode[];
	return stack.some((node) => node.type === 'attribute' && !isLoneMustacheTag(node));
}

/**
 * Currently, the compiler has a bug that duplicates text nodes when no
 *  TagLikeNode elements are present.
 */
export function removeDuplicates(root: RootNode) {
	root.children = root.children.filter((node, i, rootChildren) => {
		if (node.type !== 'text') return true;
		// https://stackoverflow.com/questions/2218999/how-to-remove-all-duplicates-from-an-array-of-objects
		return (
			i ===
			rootChildren.findIndex((t) => {
				if (t.position && node.position) {
					return (
						node.type === 'text' &&
						t.position.start.offset === node.position.start.offset &&
						t.position.start.line === node.position.start.line &&
						t.position.start.column === node.position.start.column
					);
				}
			})
		);
	});
}

/** True if the node is TagLikeNode:
 *
 * ElementNode | ComponentNode | CustomElementNode | FragmentNode */
export function isTagLikeNode(node: anyNode): node is TagLikeNode {
	return (
		node.type === 'element' ||
		node.type === 'component' ||
		node.type === 'custom-element' ||
		node.type === 'fragment'
	);
}

/**
 * Returns siblings, that is, the children of the parent.
 */
export function getSiblings(path: AstPath): anyNode[] {
	const parent = path.getParentNode();
	if (!parent) return [];

	return getChildren(parent);
}

export function getNextNode(path: AstPath): anyNode | null {
	const node = path.getNode();
	if (node) {
		const siblings = getSiblings(path);
		if (node.position?.start === siblings[siblings.length - 1].position?.start) return null;
		for (let i = 0; i < siblings.length; i++) {
			const sibling = siblings[i];
			if (sibling.position?.start === node.position?.start && i !== siblings.length - 1) {
				return siblings[i + 1];
			}
		}
	}
	return null;
}
