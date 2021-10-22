import { Ast } from '@astrojs/parser';
import { AstPath, Doc, ParserOptions, Printer } from 'prettier';
import _doc from 'prettier/doc';
const {
  builders: { breakParent, dedent, fill, group, hardline, indent, join, line, literalline, softline },
  utils: { removeLines, stripTrailingHardline },
} = _doc;
import { SassFormatter, SassFormatterConfig } from 'sass-formatter';

import { parseSortOrder, options } from './options';
import { anyNode, AttributeNode } from './nodes';

import {
  attachCommentsHTML,
  canOmitSoftlineBeforeClosingTag,
  dedent as manualDedent,
  endsWithLinebreak,
  forceIntoExpression,
  formattableAttributes,
  getMarkdownName,
  getText,
  getUnencodedText,
  indent as manualIndent,
  isASTNode,
  isDocCommand,
  isEmptyDoc,
  isEmptyTextNode,
  isInlineElement,
  isLine,
  isLoneMustacheTag,
  isNodeWithChildren,
  isOrCanBeConvertedToShorthand,
  isPreTagContent,
  isTextNode,
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
} from './utils';

function printTopLevelParts(node: Ast, path: AstPath<anyNode>, opts: ParserOptions, print: printFn): Doc {
  let docs = [];

  const normalize = (doc: Doc) => [stripTrailingHardline(doc), hardline];

  // frontmatter always comes first
  if (node.module) {
    const subDoc = normalize(path.call(print, 'module'));
    docs.push(subDoc);
  }

  // markup and styles follow, whichever the user prefers (default: markup, styles)
  for (const section of parseSortOrder(opts.astroSortOrder)) {
    switch (section) {
      case 'markup': {
        const subDoc = path.call(print, 'html');
        if (!isEmptyDoc(subDoc)) docs.push(normalize(subDoc));
        break;
      }
      case 'styles': {
        const subDoc = path.call(print, 'css');
        if (!isEmptyDoc(subDoc)) docs.push(normalize(subDoc));
        break;
      }
    }
  }

  // remove trailing softline, if any
  // const lastDoc = docs[docs.length - 1];
  // const lastItem = lastDoc[lastDoc.length - 1];

  // if (lastItem.type === 'line') docs[docs.length - 1].pop();

  return join(softline, docs);
}

function printAttributeNodeValue(path: AstPath<anyNode>, print: printFn, quotes: boolean, node: AttributeNode): Doc[] | _doc.builders.Indent {
  const valueDocs = path.map((childPath) => childPath.call(print), 'value');

  if (!quotes || !formattableAttributes.includes(node.name)) {
    return valueDocs;
  } else {
    return indent(group(trim(valueDocs, isLine)));
  }
}

// TODO: USE ASTPATH GENERIC
function printJS(path: AstPath, print: printFn, name: string, { forceSingleQuote, forceSingleLine }: { forceSingleQuote: boolean; forceSingleLine: boolean }) {
  path.getValue()[name].isJS = true;
  path.getValue()[name].forceSingleQuote = forceSingleQuote;
  path.getValue()[name].forceSingleLine = forceSingleLine;
  return path.call(print, name);
}

// TODO: MAYBE USE THIS TO HANDLE COMMENTS
function printComment(commentPath: AstPath, options: ParserOptions): Doc {
  // note(drew): this isn’t doing anything currently, but Prettier requires it anyway
  // @ts-ignore
  return commentPath;
}

export type printFn = (path: AstPath) => Doc;

function print(unknowPath: AstPath, opts: ParserOptions<typeof options>, print: printFn): Doc {
  const unknowNode = unknowPath.getValue();
  // const node = path.getValue();
  const isMarkdownSubDoc = opts.parentParser === 'markdown'; // is this a code block within .md?

  // 1. handle special node types
  if (!unknowNode) {
    return '';
  }

  if (typeof unknowNode === 'string') {
    return unknowNode;
  }

  if (Array.isArray(unknowNode)) {
    return unknowPath.map((childPath) => childPath.call(print));
  }

  if (isASTNode(unknowNode)) {
    return printTopLevelParts(unknowNode, unknowPath, opts, print);
  }

  const node = unknowNode as anyNode;
  const path = unknowPath as AstPath<anyNode>;

  // switch (true) {
  //   case !node:
  //     return '';
  //   case typeof node === 'string':
  //     return node;
  //   case Array.isArray(node):
  //     return path.map((childPath) => childPath.call(print));
  //   case isASTNode(node):
  //     return printTopLevelParts(node, path, opts, print);
  // }

  // 2. attach comments shallowly to children, if any (https://prettier.io/docs/en/plugins.html#manually-attaching-a-comment)
  if (!isPreTagContent(path) && !isMarkdownSubDoc) {
    attachCommentsHTML(node);
  }

  // 3. handle printing
  switch (node.type) {
    case 'Fragment': {
      const text = getText(node, opts);
      if (text.length === 0) {
        return '';
      }

      if (!isNodeWithChildren(node) || node.children.every(isEmptyTextNode)) return '';

      // If this is the start of a markdown code block, remove arbitrary beginning whitespace
      if (isMarkdownSubDoc) {
        if (isEmptyTextNode(node.children[0])) node.children.shift();
      }

      // If we don't see any JSX expressions, this is just embedded HTML
      // and we can skip a bunch of work. Hooray!
      const hasInlineComponent = node.children.filter((x) => x.type === 'InlineComponent').length > 0;
      if (text.indexOf('{') === -1 && !hasInlineComponent) {
        // TODO:CHECK 'node.__isRawHTML'
        node.__isRawHTML = true;
        node.content = text;
        return path.call(print);
        // return path.map(print, 'children');
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
    case 'Text': {
      const rawText = getUnencodedText(node);

      if (isPreTagContent(path)) {
        if (path.getParentNode()?.type === 'Attribute') {
          // Direct child of attribute value -> add literallines at end of lines
          // so that other things don't break in unexpected places
          return replaceEndOfLineWith(rawText, literalline);
        }
        return rawText;
      }

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

    // case 'SlotTemplate':
    // case 'Window':
    // case 'Head':
    // case 'Title':
    case 'Element':
    case 'InlineComponent':
    case 'Slot': {
      const isEmpty = node.children?.every((child) => isEmptyTextNode(child));
      const isSelfClosingTag = isEmpty && (node.type !== 'Element' || selfClosingTags.indexOf(node.name) !== -1);
      const attributes = path.map(print, 'attributes');
      if (isSelfClosingTag) {
        return group(['<', node.name, indent(group([...attributes, ''])), ...[' ', `/>`]]);
        // return group(['<', node.name, indent(group([...attributes, opts.jsxBracketNewLine ? dedent(line) : ''])), ...[opts.jsxBracketNewLine ? '' : ' ', `/>`]]);
      }
      try {
        if (node.name.toLowerCase() === '!doctype') {
          const attributesWithLowercaseHTML = attributes.map((attribute) => {
            if (typeof attribute === 'string') return attribute;
            if (isDocCommand(attribute)) return attribute;
            attribute = attribute.map((attrValue) => {
              if (typeof attrValue !== 'string') return attrValue;
              if (attrValue.toLowerCase() === 'html') {
                attrValue = attrValue.toLowerCase();
              }
              return attrValue;
            });

            // if (attribute[0].type === 'line' && attribute[1].toLowerCase() === 'html') {
            //   attribute[1] = attribute[1].toLowerCase();
            //   return attribute;
            // }
            return attribute;
          });

          return group(['<', node.name.toUpperCase(), ...attributesWithLowercaseHTML, `>`]);
        }
      } catch (e) {
        console.warn(`error ${e} in the doctype printing`);
      }

      if (node.children) {
        const children = node.children;
        const firstChild = children[0];
        const lastChild = children[children.length - 1];

        // No hugging of content means it's either a block element and/or there's whitespace at the start/end
        let noHugSeparatorStart: _doc.builders.Concat | _doc.builders.Line | _doc.builders.Softline | string = softline;
        let noHugSeparatorEnd: _doc.builders.Concat | _doc.builders.Line | _doc.builders.Softline | string = softline;
        let hugStart = shouldHugStart(node, opts);
        let hugEnd = shouldHugEnd(node, opts);

        let body;

        const isMarkdownComponent =
          // TODO: opts.__astro & opts.__astro.markdownName
          // @ts-ignore
          node.type === 'InlineComponent' && opts.__astro && opts.__astro.markdownName && opts.__astro.markdownName.has(node.name) && isNodeWithChildren(node);

        if (isEmpty) {
          body =
            isInlineElement(path, opts, node) && node.children.length && isTextNodeStartingWithWhitespace(node.children[0]) && !isPreTagContent(path)
              ? () => line
              : // () => (opts.jsxBracketNewLine ? '' : softline);
                () => softline;
        } else if (isMarkdownComponent) {
          // collapse children into raw Markdown text
          const text = node.children.map(getUnencodedText).join('').trim();
          node.children = [{ start: firstChild.start, end: lastChild.end - 2, type: 'Text', data: text, raw: text, __isRawMarkdown: true }];
          body = () => path.map(print, 'children');

          // set hugEnd
          hugStart = false;
          hugEnd = false;
        } else if (isPreTagContent(path)) {
          body = () => printRaw(node, opts.originalText);
        } else if (isInlineElement(path, opts, node) && !isPreTagContent(path)) {
          body = () => path.map(print, 'children');
        } else {
          body = () => path.map(print, 'children');
        }

        const openingTag = ['<', node.name, indent(group([...attributes, hugStart ? '' : !isPreTagContent(path) ? dedent(softline) : '']))];
        // const openingTag = ['<', node.name, indent(group([...attributes, hugStart ? '' : opts.jsxBracketNewLine && !isPreTagContent(path) ? dedent(softline) : '']))];

        if (hugStart && hugEnd) {
          const huggedContent = [softline, group(['>', body(), `</${node.name}`])];

          const omitSoftlineBeforeClosingTag = isEmpty || canOmitSoftlineBeforeClosingTag(node, path, opts);
          // const omitSoftlineBeforeClosingTag = (isEmpty && opts.jsxBracketNewLine) || canOmitSoftlineBeforeClosingTag(node, path, opts);
          return group([...openingTag, isEmpty ? group(huggedContent) : group(indent(huggedContent)), omitSoftlineBeforeClosingTag ? '' : softline, '>']);
        }

        if (isPreTagContent(path)) {
          noHugSeparatorStart = '';
          noHugSeparatorEnd = '';
        } else if (isMarkdownComponent) {
          noHugSeparatorStart = softline;
          noHugSeparatorEnd = softline;
        } else {
          let didSetEndSeparator = false;

          if (!hugStart && firstChild && isTextNode(firstChild)) {
            if (isTextNodeStartingWithLinebreak(firstChild) && firstChild !== lastChild && (!isInlineElement(path, opts, node) || isTextNodeEndingWithWhitespace(lastChild))) {
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
      // missing test ?
      return [];
    case 'MustacheTag':
      return [
        '{',
        printJS(path, print, 'expression', {
          forceSingleLine: true,
          forceSingleQuote: false,
        }),
        '}',
      ];
    // TODO: ADD TEST OR REMOVE
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
    case 'Comment':
      return ['<!--', getUnencodedText(node), '-->'];
    // TODO: ADD TEST OR REMOVE
    // case 'CodeSpan':
    //   return getUnencodedText(node);
    case 'CodeFence': {
      console.debug(node);
      // const lang = node.metadata.slice(3);
      return [node.metadata, hardline, /** somehow call textToDoc(lang),  */ node.data, hardline, '```', hardline];

      // We should use `node.metadata` to select a parser to embed with... something like return [node.metadata, hardline textToDoc(node.getMetadataLanguage()), hardline, `\`\`\``];
    }
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
function splitTextToDocs(node: anyNode): Doc[] {
  const text = getUnencodedText(node);

  let textLines = text.split(/[\t\n\f\r ]+/);

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

// TODO: CHANGE 'parsers' TYPE
function expressionParser(text: string, parsers: any, opts: ParserOptions) {
  const ast = parsers.babel(text, parsers, opts);

  return { ...ast, program: ast.program.body[0].expression };
}

function embed(path: AstPath<anyNode>, print: printFn, textToDoc: (text: string, options: object) => Doc, opts: ParserOptions) {
  // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
  // @ts-ignore
  if (!opts.__astro) opts.__astro = {};

  const node = path.getValue();

  if (!node) return null;

  // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
  // @ts-ignore
  if (node.__isRawMarkdown) {
    const docs = textToDoc(getUnencodedText(node), { ...opts, parser: 'markdown' });
    return stripTrailingHardline(docs);
  }

  // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
  // @ts-ignore
  if (node.type === 'Script' && !opts.__astro.markdownName) {
    // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
    // @ts-ignore
    opts.__astro.markdownName = getMarkdownName(node.content);
  }

  // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
  // @ts-ignore
  if (node.isJS) {
    try {
      const embeddedopts = {
        parser: expressionParser,
      };
      // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
      // @ts-ignore
      if (node.forceSingleQuote) {
        // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
        // @ts-ignore
        embeddedopts.singleQuote = true;
      }

      const docs = textToDoc(forceIntoExpression(getText(node, opts)), embeddedopts);
      // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
      // @ts-ignore
      return node.forceSingleLine ? removeLines(docs) : docs;
    } catch (e) {
      return getText(node, opts);
    }
  }

  if (node.type === 'Script' && node.context === 'setup') {
    return group(['---', hardline, textToDoc(node.content, { ...opts, parser: 'typescript' }), '---', hardline]);
  }

  // format <script type="module"> content
  if (isTextNode(node)) {
    const parent = path.getParentNode();

    if (parent && parent.type === 'Element' && parent.name === 'script') {
      const formatttedScript = textToDoc(node.data, { ...opts, parser: 'typescript' });
      if (typeof formatttedScript === 'string') return formatttedScript;
      if (isDocCommand(formatttedScript)) return formatttedScript;
      return group(formatttedScript[0]);
      // const [formatttedScript, ,] = textToDoc(node.data, { ...opts, parser: 'typescript' });
      // return group(formatttedScript);
    }
  }

  if (node.type === 'Style') {
    const supportedStyleLangValues = ['css', 'scss', 'sass'];
    let parserLang = 'css';

    if ('attributes' in node) {
      const langAttribute = node.attributes.filter((x) => x.name === 'lang');
      if (langAttribute.length) {
        const styleLang = langAttribute[0].value[0].raw.toLowerCase();
        if (supportedStyleLangValues.includes(styleLang)) parserLang = styleLang;
      }
    }

    switch (parserLang) {
      case 'css':
      case 'scss': {
        // the css parser appends an extra indented hardline, which we want outside of the `indent()`,
        // so we remove the last element of the array
        let formattedStyles = textToDoc(node.content.styles, { ...opts, parser: parserLang });
        if (typeof formattedStyles === 'string') return formattedStyles;
        if (isDocCommand(formattedStyles)) return formattedStyles;
        formattedStyles = formattedStyles[0];
        // const [formattedStyles, ,] = textToDoc(node.content.styles, { ...opts, parser: parserLang });

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
        const { result: raw, tabSize } = manualDedent(node.content.styles);

        // format + re-indent
        let formattedSassIndented = SassFormatter.Format(raw, sassOptions).trim();
        const indentChar = new Array(Math.max(tabSize, 2) + 1).join(opts.useTabs ? '\t' : ' ');
        formattedSassIndented = manualIndent(formattedSassIndented, indentChar);

        // print
        const formattedSass = join(hardline, formattedSassIndented.split('\n'));
        const attributes = path.map(print, 'attributes');
        const openingTag = group(['<style', indent(group(attributes)), softline, '>']);
        return [openingTag, hardline, formattedSass, hardline, '</style>'];
      }
    }
  }

  // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
  // @ts-ignore
  if (node.__isRawHTML) {
    // TODO: ADD TYPES OR FIND ANOTHER WAY TO ACHIVE THIS
    // @ts-ignore
    return textToDoc(node.content, { ...opts, parser: 'html' });
  }

  return null;
}

// TODO: USE ASTPATH GENERIC
function hasPrettierIgnore(path: AstPath) {
  const node = path.getNode();

  if (!node || !Array.isArray(node.comments)) return false;

  const hasIgnore = node.comments.some(
    // TODO: ADD 'comment' TYPE
    (comment: any) => comment.data.includes('prettier-ignore') && !comment.data.includes('prettier-ignore-start') && !comment.data.includes('prettier-ignore-end')
  );
  return hasIgnore;
}

const printer: Printer = {
  print,
  printComment,
  embed,
  hasPrettierIgnore,
};

export default printer;
