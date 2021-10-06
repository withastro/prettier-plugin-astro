const { doc, util } = require('prettier');

// @see http://xahlee.info/js/html5_non-closing_tag.html
const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements#Elements
const blockElements = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
];

/**
 * HTML attributes that we may safely reformat (trim whitespace, add or remove newlines)
 */
const formattableAttributes = [
  // None at the moment
  // Prettier HTML does not format attributes at all
  // and to be consistent we leave this array empty for now
];

const rootNodeKeys = new Set(['html', 'css', 'module']);
/**
 *
 * @param {any} node
 * @returns {node is import('@astrojs/parser').Ast}
 */
const isASTNode = (node) => typeof node === 'object' && Object.keys(node).filter((key) => rootNodeKeys.has(key)).length === rootNodeKeys.size;

/**
 *
 * @param {any} node
 * @returns {boolean}
 */
const isEmptyTextNode = (node) => {
  return !!node && node.type === 'Text' && getUnencodedText(node).trim() === '';
};

const isPreTagContent = (path) => {
  if (!path || !path.stack || !Array.isArray(path.stack)) return false;
  return path.stack.some((node) => (node.type === 'Element' && node.name.toLowerCase() === 'pre') || (node.type === 'Attribute' && !formattableAttributes.includes(node.name)));
};

function isLoneMustacheTag(node) {
  return node !== true && node.length === 1 && node[0].type === 'MustacheTag';
}

function isAttributeShorthand(node) {
  return node !== true && node.length === 1 && node[0].type === 'AttributeShorthand';
}

/**
 * True if node is of type `{a}` or `a={a}`
 */
function isOrCanBeConvertedToShorthand(node) {
  if (isAttributeShorthand(node.value)) {
    return true;
  }

  if (isLoneMustacheTag(node.value)) {
    const expression = node.value[0].expression;
    return (expression.type === 'Identifier' && expression.name === node.name) || (expression.type === 'Expression' && expression.codeChunks[0] === node.name);
  }

  return false;
}

const flatten = (arrays) => [].concat.apply([], arrays);

/**
 *
 * @param {any} node
 * @param {import('prettier').ParserOptions} options
 */
function getText(node, options) {
  const leadingComments = node.leadingComments;

  return options.originalText.slice(
    options.locStart(
      // if there are comments before the node they are not included
      // in the `start` of the node itself
      (leadingComments && leadingComments[0]) || node
    ),
    options.locEnd(node)
  );
}

function getUnencodedText(node) {
  // `raw` will contain HTML entities in unencoded form
  return node.raw || node.data;
}

function replaceEndOfLineWith(text, replacement) {
  const parts = [];
  for (const part of text.split('\n')) {
    if (parts.length > 0) {
      parts.push(replacement);
    }
    if (part.endsWith('\r')) {
      parts.push(part.slice(0, -1));
    } else {
      parts.push(part);
    }
  }
  return parts;
}

/**
 *
 * @param { ElementNode | InlineComponentNode | SlotNode | WindowNode | HeadNode | TitleNode | SlotTemplateNode } node
 * @param {string} originalText string
 * @param {boolean} stripLeadingAndTrailingNewline boolean
 * @returns {string}
 */
function printRaw(node, originalText, stripLeadingAndTrailingNewline = false) {
  if (node.children.length === 0) {
    return '';
  }

  const firstChild = node.children[0];
  const lastChild = node.children[node.children.length - 1];

  let raw = originalText.substring(firstChild.start, lastChild.end);

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

function isNodeWithChildren(node) {
  return node && Array.isArray(node.children);
}

function isInlineElement(path, options, node) {
  return node && node.type === 'Element' && !isBlockElement(node, options) && !isPreTagContent(path);
}

function isBlockElement(node, options) {
  return node && node.type === 'Element' && options.htmlWhitespaceSensitivity !== 'strict' && (options.htmlWhitespaceSensitivity === 'ignore' || blockElements.includes(node.name));
}

function isTextNodeStartingWithLinebreak(node, nrLines = 1) {
  return node.type === 'Text' && startsWithLinebreak(getUnencodedText(node), nrLines);
}

function startsWithLinebreak(text, nrLines = 1) {
  return new RegExp(`^([\\t\\f\\r ]*\\n){${nrLines}}`).test(text);
}

function isTextNodeEndingWithLinebreak(node, nrLines = 1) {
  return node.type === 'Text' && endsWithLinebreak(getUnencodedText(node), nrLines);
}

function endsWithLinebreak(text, nrLines = 1) {
  return new RegExp(`(\\n[\\t\\f\\r ]*){${nrLines}}$`).test(text);
}

function isTextNodeStartingWithWhitespace(node) {
  return node.type === 'Text' && /^\s/.test(getUnencodedText(node));
}

function isTextNodeEndingWithWhitespace(node) {
  return node.type === 'Text' && /\s$/.test(getUnencodedText(node));
}

function forceIntoExpression(statement) {
  // note the trailing newline: if the statement ends in a // comment,
  // we can't add the closing bracket right afterwards
  return `(${statement}\n)`;
}

function shouldHugStart(node, options) {
  if (isBlockElement(node, options)) {
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
function shouldHugEnd(node, options) {
  if (isBlockElement(node, options)) {
    return false;
  }

  if (!isNodeWithChildren(node)) {
    return false;
  }

  const children = node.children;
  if (children.length === 0) {
    return true;
  }

  const lastChild = children[children.length - 1];
  return !isTextNodeEndingWithWhitespace(lastChild);
}

/**
 * Returns true if the softline between `</tagName` and `>` can be omitted.
 */
function canOmitSoftlineBeforeClosingTag(node, path, options) {
  return !options.svelteBracketNewLine && (!hugsStartOfNextNode(node, options) || isLastChildWithinParentBlockElement(path, options));
}

/**
 * Return true if given node does not hug the next node, meaning there's whitespace
 * or the end of the doc afterwards.
 */
function hugsStartOfNextNode(node, options) {
  if (node.end === options.originalText.length) {
    // end of document
    return false;
  }

  return !options.originalText.substring(node.end).match(/^\s/);
}

function getChildren(node) {
  return isNodeWithChildren(node) ? node.children : [];
}

function isLastChildWithinParentBlockElement(path, options) {
  const parent = path.getParentNode();
  if (!parent || !isBlockElement(parent, options)) {
    return false;
  }

  const children = getChildren(parent);
  const lastChild = children[children.length - 1];
  return lastChild === path.getNode();
}

function trimTextNodeLeft(node) {
  node.raw = node.raw && node.raw.trimLeft();
  node.data = node.data && node.data.trimLeft();
}

function trimTextNodeRight(node) {
  node.raw = node.raw && node.raw.trimRight();
  node.data = node.data && node.data.trimRight();
}

function findLastIndex(isMatch, items) {
  for (let i = items.length - 1; i >= 0; i--) {
    if (isMatch(items[i], i)) {
      return i;
    }
  }

  return -1;
}

/**
 * Remove all leading whitespace up until the first non-empty text node,
 * and all trailing whitepsace from the last non-empty text node onwards.
 */
function trimChildren(children, path) {
  let firstNonEmptyNode = children.findIndex((n) => !isEmptyTextNode(n) && !doesEmbedStartAfterNode(n, path));
  firstNonEmptyNode = firstNonEmptyNode === -1 ? children.length - 1 : firstNonEmptyNode;

  let lastNonEmptyNode = findLastIndex((n, idx) => {
    // Last node is ok to end at the start of an embedded region,
    // if it's not a comment (which should stick to the region)
    return !isEmptyTextNode(n) && ((idx === children.length - 1 && n.type !== 'Comment') || !doesEmbedStartAfterNode(n, path));
  }, children);
  lastNonEmptyNode = lastNonEmptyNode === -1 ? 0 : lastNonEmptyNode;

  for (let i = 0; i <= firstNonEmptyNode; i++) {
    const n = children[i];
    if (n.type === 'Text') {
      trimTextNodeLeft(n);
    }
  }

  for (let i = children.length - 1; i >= lastNonEmptyNode; i--) {
    const n = children[i];
    if (n.type === 'Text') {
      trimTextNodeRight(n);
    }
  }
}

/**
 * Returns siblings, that is, the children of the parent.
 */
function getSiblings(path) {
  let parent = path.getParentNode();

  if (isASTNode(parent)) {
    parent = parent.html;
  }

  return getChildren(parent);
}

/**
 * Did there use to be any embedded object (that has been snipped out of the AST to be moved)
 * at the specified position?
 */
function doesEmbedStartAfterNode(node, path, siblings = getSiblings(path)) {
  // If node is not at the top level of html, an embed cannot start after it,
  // because embeds are only at the top level
  if (!isNodeTopLevelHTML(node, path)) {
    return false;
  }

  const position = node.end;
  const root = path.stack[0];

  const embeds = [root.module, root.html, root.css];

  const nextNode = siblings[siblings.indexOf(node) + 1];
  return embeds.find((n) => n && n.start >= position && (!nextNode || n.end <= nextNode.start));
}

function isNodeTopLevelHTML(node, path) {
  const root = path.stack[0];
  return !!root.html && !!root.html.children && root.html.children.includes(node);
}

/**
 * Check if doc is a hardline.
 * We can't just rely on a simple equality check because the doc could be created with another
 * runtime version of prettier than what we import, making a reference check fail.
 */
function isHardline(docToCheck) {
  return docToCheck === doc.builders.hardline || deepEqual(docToCheck, doc.builders.hardline);
}

/**
 * Simple deep equal function which suits our needs. Only works properly on POJOs without cyclic deps.
 */
function deepEqual(x, y) {
  if (x === y) {
    return true;
  } else if (typeof x == 'object' && x != null && typeof y == 'object' && y != null) {
    if (Object.keys(x).length != Object.keys(y).length) return false;

    for (var prop in x) {
      if (Object.prototype.hasOwnProperty.call(y, prop)) {
        if (!deepEqual(x[prop], y[prop])) return false;
      } else {
        return false;
      }
    }

    return true;
  } else {
    return false;
  }
}

function isLine(docToCheck) {
  return (
    isHardline(docToCheck) ||
    (typeof docToCheck === 'object' && docToCheck.type === 'line') ||
    (typeof docToCheck === 'object' && docToCheck.type === 'concat' && docToCheck.parts.every(isLine))
  );
}

/**
 * Check if the doc is empty, i.e. consists of nothing more than empty strings (possibly nested).
 */
function isEmptyDoc(doc) {
  if (typeof doc === 'string') {
    return doc.length === 0;
  }

  if (doc.type === 'line') {
    return !doc.keepIfLonely;
  }

  // Since Prettier 2.3.0, concats are represented as flat arrays
  if (Array.isArray(doc)) {
    return doc.length === 0;
  }

  const { contents } = doc;

  if (contents) {
    return isEmptyDoc(contents);
  }

  const { parts } = doc;

  if (parts) {
    return isEmptyGroup(parts);
  }

  return false;
}

function isEmptyGroup(group) {
  return !group.find((doc) => !isEmptyDoc(doc));
}

/**
 * Trims both leading and trailing nodes matching `isWhitespace` independent of nesting level
 * (though all trimmed adjacent nodes need to be a the same level). Modifies the `docs` array.
 */
function trim(docs, isWhitespace) {
  trimLeft(docs, isWhitespace);
  trimRight(docs, isWhitespace);

  return docs;
}

/**
 * Trims the leading nodes matching `isWhitespace` independent of nesting level (though all nodes need to be a the same level).
 * If there are empty docs before the first whitespace, they are removed, too.
 */
function trimLeft(group, isWhitespace) {
  let firstNonWhitespace = group.findIndex((doc) => !isEmptyDoc(doc) && !isWhitespace(doc));

  if (firstNonWhitespace < 0 && group.length) {
    firstNonWhitespace = group.length;
  }

  if (firstNonWhitespace > 0) {
    const removed = group.splice(0, firstNonWhitespace);
    if (removed.every(isEmptyDoc)) {
      return trimLeft(group, isWhitespace);
    }
  } else {
    const parts = getParts(group[0]);

    if (parts) {
      return trimLeft(parts, isWhitespace);
    }
  }
}

/**
 * Trims the trailing nodes matching `isWhitespace` independent of nesting level (though all nodes need to be a the same level).
 * If there are empty docs after the last whitespace, they are removed, too.
 */
function trimRight(group, isWhitespace) {
  let lastNonWhitespace = group.length ? findLastIndex((doc) => !isEmptyDoc(doc) && !isWhitespace(doc), group) : 0;

  if (lastNonWhitespace < group.length - 1) {
    const removed = group.splice(lastNonWhitespace + 1);
    if (removed.every(isEmptyDoc)) {
      return trimRight(group, isWhitespace);
    }
  } else {
    const parts = getParts(group[group.length - 1]);

    if (parts) {
      return trimRight(parts, isWhitespace);
    }
  }
}

function getParts(doc) {
  if (typeof doc === 'object') {
    // Since Prettier 2.3.0, concats are represented as flat arrays
    if (Array.isArray(doc)) {
      return doc;
    }
    if (doc.type === 'fill' || doc.type === 'concat') {
      return doc.parts;
    }
    if (doc.type === 'group') {
      return getParts(doc.contents);
    }
  }
}

const isObjEmpty = (obj) => {
  for (let i in obj) return false;
  return true;
};

/** Recursively attach comments to nodes */
function attachCommentsHTML(node) {
  if (!isNodeWithChildren(node) || !node.children.some(({ type }) => type === 'Comment')) return;

  const nodesToRemove = [];

  // note: the .length - 1 is because we don’t need to read the last node
  for (let n = 0; n < node.children.length - 1; n++) {
    if (!node.children[n]) continue;

    // attach comment to the next non-whitespace node
    if (node.children[n].type === 'Comment') {
      let next = n + 1;
      while (isEmptyTextNode(node.children[next])) {
        nodesToRemove.push(next); // if arbitrary whitespace between comment and node, remove
        next++; // skip to the next non-whitespace node
      }
      util.addLeadingComment(node.children[next], node.children[n]);
    }
  }

  // remove arbitrary whitespace nodes
  nodesToRemove.reverse(); // start at back so we aren’t changing indices
  nodesToRemove.forEach((index) => {
    node.children.splice(index, 1);
  });
}

module.exports = {
  attachCommentsHTML,
  canOmitSoftlineBeforeClosingTag,
  endsWithLinebreak,
  flatten,
  forceIntoExpression,
  formattableAttributes,
  getText,
  getUnencodedText,
  isASTNode,
  isAttributeShorthand,
  isBlockElement,
  isEmptyDoc,
  isEmptyTextNode,
  isInlineElement,
  isLine,
  isLoneMustacheTag,
  isNodeWithChildren,
  isObjEmpty,
  isOrCanBeConvertedToShorthand,
  isPreTagContent,
  isTextNodeEndingWithLinebreak,
  isTextNodeEndingWithWhitespace,
  isTextNodeStartingWithLinebreak,
  isTextNodeStartingWithWhitespace,
  printRaw,
  replaceEndOfLineWith,
  selfClosingTags,
  shouldHugEnd,
  shouldHugStart,
  startsWithLinebreak,
  trim,
  trimChildren,
  trimTextNodeLeft,
  trimTextNodeRight,
};
