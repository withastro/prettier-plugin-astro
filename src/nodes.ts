import {
  Node,
  AttributeNode,
  RootNode,
  ElementNode,
  ComponentNode,
  CustomElementNode,
  ExpressionNode,
  TextNode,
  FrontmatterNode,
  DoctypeNode,
  CommentNode,
} from '@astrojs/compiler/types';

// MISSING ATTRIBUTE NODE FROM THE NODE TYPE

export interface NodeWithText {
  value: string;
}

// export interface Ast {
//   html: anyNode;
//   css: StyleNode[];
//   module: ScriptNode;
//   meta: {
//     features: number;
//   };
// }

// export interface BaseNode {
//   start: number;
//   end: number;
//   type: string;
//   children?: anyNode[];
//   // TODO: ADD BETTER TYPE
//   [prop_name: string]: any;
// }

// export type attributeValue = TextNode[] | AttributeShorthandNode[] | MustacheTagNode[] | true;

export interface NodeWithChildren {
  // children: anyNode[];
  children: Node[];
}

// export interface NodeWithText {
//   data: string;
//   raw?: string;
// }

// export interface FragmentNode extends BaseNode {
//   type: 'Fragment';
//   children: anyNode[];
// }

// export interface TextNode extends BaseNode {
//   type: 'Text';
//   data: string;
//   raw: string;
// }

// export interface CodeFenceNode extends BaseNode {
//   type: 'CodeFence';
//   metadata: string;
//   data: string;
//   raw: string;
// }

// export interface CodeSpanNode extends BaseNode {
//   type: 'CodeSpan';
//   metadata: string;
//   data: string;
//   raw: string;
// }

// export interface SpreadNode extends BaseNode {
//   type: 'Spread';
//   expression: ExpressionNode;
// }

// export interface ExpressionNode {
//   type: 'Expression';
//   start: number;
//   end: number;
//   codeChunks: string[];
//   children: anyNode[];
// }

// export interface ScriptNode extends BaseNode {
//   type: 'Script';
//   context: 'runtime' | 'setup';
//   content: string;
// }

// export interface StyleNode extends BaseNode {
//   type: 'Style';
//   // TODO: ADD BETTER TYPE
//   attributes: any[];
//   content: {
//     start: number;
//     end: number;
//     styles: string;
//   };
// }

// export interface AttributeNode extends BaseNode {
//   type: 'Attribute';
//   name: string;
//   value: attributeValue;
// }

// export interface AttributeShorthandNode extends BaseNode {
//   type: 'AttributeShorthand';
//   expression: IdentifierNode;
// }

// export interface IdentifierNode extends BaseNode {
//   type: 'Identifier';
//   name: string;
// }

// export interface MustacheTagNode extends BaseNode {
//   type: 'MustacheTag';
//   expression: ExpressionNode;
// }

// export interface SlotNode extends BaseNode {
//   type: 'Slot';
//   name: string;
//   attributes: AttributeNode[];
// }

// export interface CommentNode extends BaseNode {
//   type: 'Comment';
//   data: string;
//   name?: string;
//   leading?: boolean;
//   trailing?: boolean;
//   printed?: boolean;
//   nodeDescription?: string;
// }

// export interface ElementNode extends BaseNode {
//   type: 'Element';
//   name: string;
//   attributes: AttributeNode[];
// }

// export interface InlineComponentNode extends BaseNode {
//   type: 'InlineComponent';
//   name: string;
//   attributes: AttributeNode[];
// }

export interface BlockElementNode extends ElementNode {
  name: typeof blockElementsT[number];
}

export interface InlineElementNode extends ElementNode {
  name: typeof inlineElementsT[number];
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements#Elements
const blockElementsT = [
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
  // TODO: WIP
  'title',
  'html',
] as const;
// https://github.com/microsoft/TypeScript/issues/31018
export const blockElements: string[] = [...blockElementsT];

// https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
const inlineElementsT = [
  'a',
  'abbr',
  'acronym',
  'audio',
  'b',
  'bdi',
  'bdo',
  'big',
  'br',
  'button',
  'canvas',
  'cite',
  'code',
  'data',
  'datalist',
  'del',
  'dfn',
  'em',
  'embed',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'map',
  'mark',
  'meter',
  'noscript',
  'object',
  'output',
  'picture',
  'progress',
  'q',
  'ruby',
  's',
  'samp',
  'script',
  'select',
  'slot',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'svg',
  'template',
  'textarea',
  'time',
  'u',
  'tt',
  'var',
  'video',
  'wbr',
] as const;
// https://github.com/microsoft/TypeScript/issues/31018
export const inlineElements: string[] = [...inlineElementsT];

// @see http://xahlee.info/js/html5_non-closing_tag.html
export const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

export type anyNode = RootNode | AttributeNode | ElementNode | ComponentNode | CustomElementNode | ExpressionNode | TextNode | DoctypeNode | CommentNode;

export type {
  AttributeNode,
  Node,
  RootNode,
  ElementNode,
  ComponentNode,
  CustomElementNode,
  ExpressionNode,
  TextNode,
  FrontmatterNode,
  DoctypeNode,
  CommentNode,
} from '@astrojs/compiler/types';
