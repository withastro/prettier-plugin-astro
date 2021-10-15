// TODO: MAYBE WE SHOULD USE TYPES FROM THE PARSER WHEN 0.21 RELEASES

import {
  BaseNode,
  CodeFence as CodeFenceNode,
  Fragment as FragmentNode,
  Text as TextNode,
  CodeSpan as CodeSpanNode,
  Transition as TransitionNode,
  Expression as ExpressionNode,
  Script as ScriptNode,
  Style as StyleNode,
  TemplateNode,
} from '@astrojs/parser';

export type attributeValue = TextNode[] | AttributeShorthandNode[] | MustacheTagNode[] | true;

export interface NodeWithChildren {
  children: TemplateNode[] | BaseNode[];
}

export interface AttributeNode extends BaseNode {
  type: 'Attribute';
  name: string;
  value: attributeValue;
}

export interface AttributeShorthandNode extends BaseNode {
  type: 'AttributeShorthand';
  expression: IdentifierNode;
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface MustacheTagNode extends BaseNode {
  type: 'MustacheTag';
  expression: ExpressionNode;
}

export interface ElementNode extends BaseNode {
  type: 'Element';
  name: string;
  attributes: AttributeNode[];
}

export interface InlineComponentNode extends BaseNode {
  type: 'InlineComponent';
  name: string;
  attributes: AttributeNode[];
}

export interface SlotNode extends BaseNode {
  type: 'Slot';
  name: string;
  attributes: AttributeNode[];
}

export interface CommentNode extends BaseNode {
  type: 'Comment';
  data: string;
  name?: string;
  leading?: boolean;
  trailing?: boolean;
  printed?: boolean;
  nodeDescription?: string;
}

export type anyNode =
  | CommentNode
  | FragmentNode
  | ElementNode
  | TextNode
  | CodeFenceNode
  | CodeSpanNode
  | AttributeNode
  | MustacheTagNode
  | TransitionNode
  | ExpressionNode
  | ScriptNode
  | StyleNode
  | IdentifierNode
  | AttributeShorthandNode
  | MustacheTagNode
  | InlineComponentNode
  | SlotNode;
