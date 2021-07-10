const {
  builders: {
    join,
    line,
    hardline,
    group,
    conditionalGroup,
    indent,
    dedent,
  }
} = require("prettier/doc");
const { parseSortOrder } = require('./options');
const { isAstNode, flatten, getText } = require('./utils');

/**
 * 
 * @param {import('@astrojs/parser').Ast} node 
 * @param {import('prettier').AstPath<import('@astrojs/parser').Ast>} path 
 * @param {import('prettier').ParserOptions<any>} opts 
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

  const docs = flatten([parts.frontmatter, ...parseSortOrder(opts.astroSortOrder).map(p => parts[p])]);

  return group([join(hardline, docs)])
}

function printJS(
    path,
    print,
    name,
    { forceSingleQuote, forceSingleLine }
) {
  console.log(path, name);
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
      return "";
    case typeof node === "string":
      return node;
    case isAstNode(node):
      return printTopLevelParts(node, path, opts, print);
  }

  switch (node.type) {
    case 'Fragment': {
      const text = getText(node, opts);

      // If we don't see any JSX expressions, this is just embedded HTML
      // and we can skip a bunch of work. Hooray!
      if (text.indexOf('{') === -1) {
        node.__isRawHTML = true;
        node.content = text;
        return path.call(print);
      }
      
      return path.call(print, 'children');
    }
    // case 'MustacheTag': 
    //   return [
    //       '{',
    //         printJS(path, print, 'expression', { forceSingleLine: true, forceSingleQuote: false }),
    //       '}',
    //   ];
    // case 'Spread':
    //   return [line, '{...', printJS(path, print, 'expression', { forceSingleQuote: true, forceSingleLine: false }), '}'];
  }
};

/** @type {import('prettier').Printer['embed']} */
const embed = (path, print, textToDoc, options) => {
  const node = path.getValue();

  if (!node) return null;

  if (node.type === 'Script' && node.context === 'setup') {
    return group(['---', hardline, textToDoc(node.content, { ...options, parser: 'typescript' }), '---', hardline, hardline]);
  }

  if (node.type === 'Style') {
    console.log(node)
    return group(['<style>', hardline, dedent(textToDoc(node.content.styles, { ...options, parser: 'css' })), '</style>', hardline])
  }

  if (node.__isRawHTML) {
    return textToDoc(node.content, { ...options, parser: 'html' });
  }

  return null;
};

/** @type {import('prettier').Printer['hasPrettierIgnore']} */
const hasPrettierIgnore = (path) => {
  const node = path.getNode();
  const isSimpleIgnore = (comment) =>
    comment.value.includes("prettier-ignore") &&
    !comment.value.includes("prettier-ignore-start") &&
    !comment.value.includes("prettier-ignore-end");
  return (
    node &&
    node.comments &&
    node.comments.length > 0 &&
    node.comments.some(isSimpleIgnore)
  );
};

/** @type {import('prettier').Printer} */
const printer = {
  print,
  embed,
  hasPrettierIgnore,
};

module.exports = printer;
