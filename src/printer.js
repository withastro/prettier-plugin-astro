const {
  builders: { join, fill, line, literalline, hardline, softline, group, conditionalGroup, breakParent, indent, dedent },
  utils: { removeLines },
} = require('prettier/doc');

const { parseSortOrder } = require('./options');
const {
  isASTNode,
  isEmptyTextNode,
  isPreTagContent,
  isInlineElement,
  isEmptyDoc,
  isTextNodeStartingWithWhitespace,
  isTextNodeStartingWithLinebreak,
  isTextNodeEndingWithWhitespace,
  trimTextNodeLeft,
  trimTextNodeRight,
  isLoneMustacheTag,
  isAttributeShorthand,
  isOrCanBeConvertedToShorthand,
  selfClosingTags,
  formattableAttributes,
  getUnencodedText,
  replaceEndOfLineWith,
  forceIntoExpression,
  shouldHugStart,
  shouldHugEnd,
  canOmitSoftlineBeforeClosingTag,
  startsWithLinebreak,
  endsWithLinebreak,
  printRaw,
  trim,
  isLine,
  trimChildren,
  flatten,
  getText,
} = require('./utils');

const supportedStyleLangValues = ['css', 'scss'];

/**
 *
 * @param {import('@astrojs/parser').Ast} node
 * @param {import('prettier').AstPath<import('@astrojs/parser').Ast>} path
 * @param {import('prettier').Parseropts<any>} opts
 * @param {(path: import('prettier').AstPath<any>) => import('prettier').Doc} print
 */
const printTopLevelParts = (node, path, opts, print) => {
  const parts = {
    frontmatter: [],
    markup: [],
    styles: [],
  };

  if (node.module) {
    parts.frontmatter.push(path.call(print, 'module'));
  }

  if (node.css) {
    parts.styles.push(path.call(print, 'css'));
  }

  if (node.html) {
    parts.markup.push(path.call(print, 'html'));
  }

  const docs = flatten([parts.frontmatter, ...parseSortOrder(opts.astroSortOrder).map((p) => parts[p])]).filter((doc) => '' !== doc);
  return group([join(hardline, docs)]);
};

const printAttributeNodeValue = (path, print, quotes, node) => {
  const valueDocs = path.map((childPath) => childPath.call(print), 'value');

  if (!quotes || !formattableAttributes.includes(node.name)) {
    return valueDocs;
  } else {
    return indent(group(trim(valueDocs, isLine)));
  }
};

function printJS(path, print, name, { forceSingleQuote, forceSingleLine }) {
  path.getValue()[name].isJS = true;
  path.getValue()[name].forceSingleQuote = forceSingleQuote;
  path.getValue()[name].forceSingleLine = forceSingleLine;
  return path.call(print, name);
}

/** @type {import('prettier').Printer['print']} */
const print = (path, opts, print) => {
  const node = path.getValue();

  switch (true) {
    case !node:
      return '';
    case typeof node === 'string':
      return node;
    case Array.isArray(node):
      return path.map((childPath) => childPath.call(print));
    case isASTNode(node):
      return printTopLevelParts(node, path, opts, print);
  }

  switch (node.type) {
    case 'Fragment': {
      const text = getText(node, opts);
      if (text.length === 0) {
        return '';
      }
      // If we don't see any JSX expressions, this is just embedded HTML
      // and we can skip a bunch of work. Hooray!
      const hasInlineComponent = node.children.filter((x) => x.type === 'InlineComponent').length > 0;
      if (text.indexOf('{') === -1 && !hasInlineComponent) {
        node.__isRawHTML = true;
        node.content = text;
        return path.call(print);
      }

      const children = node.children;

      if (children.length === 0 || children.every(isEmptyTextNode)) {
        return '';
      }
      if (!isPreTagContent(path)) {
        trimChildren(node.children, path);
        const output = trim(
          [path.map(print, 'children')],
          (n) =>
            isLine(n) ||
            (typeof n === 'string' && n.trim() === '') ||
            // Because printChildren may append this at the end and
            // may hide other lines before it
            n === breakParent
        );
        if (output.every((doc) => isEmptyDoc(doc))) {
          return '';
        }
        return group([...output, hardline]);
      } else {
        return group(path.map(print, 'children'));
      }
    }
    case 'Text':
      if (!isPreTagContent(path)) {
        if (isEmptyTextNode(node)) {
          const hasWhiteSpace = getUnencodedText(node).trim().length < getUnencodedText(node).length;
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
      } else {
        const rawText = getUnencodedText(node);
        if (path.getParentNode().type === 'Attribute') {
          // Direct child of attribute value -> add literallines at end of lines
          // so that other things don't break in unexpected places
          return replaceEndOfLineWith(rawText, literalline);
        }
        return rawText;
      }
    case 'Element':
    case 'InlineComponent':
    case 'Slot':
    case 'SlotTemplate':
    case 'Window':
    case 'Head':
    case 'Title': {
      const isEmpty = node.children.every((child) => isEmptyTextNode(child));
      const isSelfClosingTag = isEmpty && (node.type !== 'Element' || selfClosingTags.indexOf(node.name) !== -1);
      const attributes = path.map((childPath) => childPath.call(print), 'attributes');

      if (isSelfClosingTag) {
        return group(['<', node.name, indent(group([...attributes, opts.jsxBracketNewLine ? dedent(line) : ''])), ...[opts.jsxBracketNewLine ? '' : ' ', `/>`]]);
      }
      try {
        if (node.name.toLowerCase() === '!doctype') {
          attributesWithLowercaseHTML = attributes.map((attribute) => {
            if (attribute[0].type === 'line' && attribute[1].toLowerCase() === 'html') {
              attribute[1] = attribute[1].toLowerCase();
              return attribute;
            }
            return attribute;
          });

          return group(['<', node.name.toUpperCase(), ...attributesWithLowercaseHTML, `>`]);
        }
      } catch (e) {
        console.warn(`error ${e} in the doctype printing`);
      }

      const children = node.children;
      const firstChild = children[0];
      const lastChild = children[children.length - 1];

      const hugStart = shouldHugStart(node, opts);
      const hugEnd = shouldHugEnd(node, opts);

      let body;

      if (isEmpty) {
        body =
          isInlineElement(path, opts, node) && node.children.length && isTextNodeStartingWithWhitespace(node.children[0]) && !isPreTagContent(path)
            ? () => line
            : () => (opts.jsxBracketNewLine ? '' : softline);
      } else if (isPreTagContent(path)) {
        body = () => printRaw(node, opts.originalText);
      } else if (isInlineElement(path, opts, node) && !isPreTagContent(path)) {
        body = () => path.map(print, 'children');
      } else {
        body = () => path.map(print, 'children');
      }

      const openingTag = ['<', node.name, indent(group([...attributes, hugStart ? '' : opts.jsxBracketNewLine && !isPreTagContent(path) ? dedent(softline) : '']))];

      if (hugStart && hugEnd) {
        const huggedContent = [softline, group(['>', body(), `</${node.name}`])];
        const omitSoftlineBeforeClosingTag = (isEmpty && opts.jsxBracketNewLine) || canOmitSoftlineBeforeClosingTag(node, path, opts);
        return group([...openingTag, isEmpty ? group(huggedContent) : group(indent(huggedContent)), omitSoftlineBeforeClosingTag ? '' : softline, '>']);
      }

      // No hugging of content means it's either a block element and/or there's whitespace at the start/end
      let noHugSeparatorStart = softline;
      let noHugSeparatorEnd = softline;
      if (isPreTagContent(path)) {
        noHugSeparatorStart = '';
        noHugSeparatorEnd = '';
      } else {
        let didSetEndSeparator = false;

        if (!hugStart && firstChild && firstChild.type === 'Text') {
          if (isTextNodeStartingWithLinebreak(firstChild) && firstChild !== lastChild && (!isInlineElement(path, opts, node) || isTextNodeEndingWithWhitespace(lastChild))) {
            noHugSeparatorStart = hardline;
            noHugSeparatorEnd = hardline;
            didSetEndSeparator = true;
          } else if (isInlineElement(path, opts, node)) {
            noHugSeparatorStart = line;
          }
          trimTextNodeLeft(firstChild);
        }
        if (!hugEnd && lastChild && lastChild.type === 'Text') {
          if (isInlineElement(path, opts, node) && !didSetEndSeparator) {
            noHugSeparatorEnd = line;
          }
          trimTextNodeRight(lastChild);
        }
      }

      if (hugStart) {
        return group([...openingTag, indent([softline, group(['>', body()])]), noHugSeparatorEnd, `</${node.name}>`]);
      }

      if (hugEnd) {
        return group([
          ...openingTag,
          '>',
          indent([noHugSeparatorStart, group([body(), `</${node.name}`])]),
          canOmitSoftlineBeforeClosingTag(node, path, opts) ? '' : softline,
          '>',
        ]);
      }

      if (isEmpty) {
        return group([...openingTag, '>', body(), `</${node.name}>`]);
      }

      return group([...openingTag, '>', indent([noHugSeparatorStart, body()]), noHugSeparatorEnd, `</${node.name}>`]);
    }
    case 'AttributeShorthand': {
      return node.expression.name;
    }
    case 'Attribute': {
      if (isOrCanBeConvertedToShorthand(node)) {
        return [line, '{', node.name, '}'];
      } else {
        if (node.value === true) {
          return [line, node.name];
        }

        const quotes = !isLoneMustacheTag(node.value);
        const attrNodeValue = printAttributeNodeValue(path, print, quotes, node);
        if (quotes) {
          return [line, node.name, '=', '"', attrNodeValue, '"'];
        } else {
          return [line, node.name, '=', attrNodeValue];
        }
      }
    }
    case 'Expression':
      return;
    case 'MustacheTag':
      return [
        '{',
        printJS(path, print, 'expression', {
          forceSingleLine: true,
          forceSingleQuote: false,
        }),
        '}',
      ];
    case 'Spread':
      return [
        line,
        '{...',
        printJS(path, print, 'expression', {
          forceSingleQuote: true,
          forceSingleLine: false,
        }),
        '}',
      ];
    case 'Comment':
      return [`<!--`, getUnencodedText(node), `-->`];
    case 'CodeSpan':
      return getUnencodedText(node);
    case 'CodeFence':
      console.debug(node);
      return getUnencodedText(node);
    // We should use `node.metadata` to select a parser to embed with... something like return [node.metadata, hardline textToDoc(node.getMetadataLanguage()), hardline, `\`\`\``];
    default: {
      throw new Error(`Unhandled node type "${node.type}"!`);
    }
  }
};

/**
 * Split the text into words separated by whitespace. Replace the whitespaces by lines,
 * collapsing multiple whitespaces into a single line.
 *
 * If the text starts or ends with multiple newlines, two of those should be kept.
 */
function splitTextToDocs(node) {
  const text = getUnencodedText(node);
  let docs = text.split(/[\t\n\f\r ]+/);

  docs = join(line, docs).parts.filter((s) => s !== '');

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

function expressionParser(text, parsers, opts) {
  const ast = parsers.babel(text, parsers, opts);

  return { ...ast, program: ast.program.body[0].expression };
}

/** @type {import('prettier').Printer['embed']} */
const embed = (path, print, textToDoc, opts) => {
  const node = path.getValue();

  if (!node) return null;

  if (node.isJS) {
    try {
      const embeddedopts = {
        parser: expressionParser,
      };
      if (node.forceSingleQuote) {
        embeddedopts.singleQuote = true;
      }

      const docs = textToDoc(forceIntoExpression(getText(node, opts)), embeddedopts);
      return node.forceSingleLine ? removeLines(docs) : docs;
    } catch (e) {
      return getText(node, opts);
    }
  }

  if (node.type === 'Script' && node.context === 'setup') {
    return group(['---', hardline, textToDoc(node.content, { ...opts, parser: 'typescript' }), '---', hardline]);
  }

  // format <script type="module"> content
  if (node.type === 'Text') {
    const parent = path.getParentNode();
    if (parent.type === 'Element' && parent.name === 'script') {
      const [formatttedScript, _] = textToDoc(node.data, { ...opts, parser: 'typescript' });
      return group(formatttedScript);
    }
  }

  if (node.type === 'Style') {
    let styleLang = '';
    let parserLang = '';

    if ('attributes' in node) {
      const langAttribute = node.attributes.filter((x) => x.name === 'lang');
      if (langAttribute.length === 0) styleLang = 'css';
      else {
        styleLang = langAttribute[0].value[0].raw.toLowerCase();
      }
    }
    if (styleLang in supportedStyleLangValues) parserLang = styleLang;
    // TODO(obnoxiousnerd): Provide error handling in case of unrecognized
    // styles language.
    else parserLang = 'css';

    // the css parser appends an extra indented hardline, which we want outside of the `indent()`,
    // so we remove the last element of the array
    const [formatttedStyles, _] = textToDoc(node.content.styles, { ...opts, parser: parserLang });
    return group([styleLang !== 'css' ? `<style lang="${styleLang}">` : '<style>', indent([hardline, formatttedStyles]), hardline, '</style>', hardline]);
  }

  if (node.__isRawHTML) {
    return textToDoc(node.content, { ...opts, parser: 'html' });
  }

  return null;
};

/** @type {import('prettier').Printer['hasPrettierIgnore']} */
const hasPrettierIgnore = (path) => {
  const node = path.getNode();
  const isSimpleIgnore = (comment) =>
    comment.value.includes('prettier-ignore') && !comment.value.includes('prettier-ignore-start') && !comment.value.includes('prettier-ignore-end');
  return node && node.comments && node.comments.length > 0 && node.comments.some(isSimpleIgnore);
};

/** @type {import('prettier').Printer} */
const printer = {
  print,
  embed,
  hasPrettierIgnore,
};

module.exports = printer;
