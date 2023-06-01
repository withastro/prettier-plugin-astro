import type {
	AttributeNode,
	CommentNode,
	ComponentNode,
	CustomElementNode,
	DoctypeNode,
	ElementNode,
	ExpressionNode,
	FragmentNode,
	FrontmatterNode,
	Node,
	ParentLikeNode,
	RootNode,
	TagLikeNode,
	TextNode,
} from '@astrojs/compiler/types';

export type anyNode =
	| RootNode
	| AttributeNode
	| ElementNode
	| ComponentNode
	| CustomElementNode
	| ExpressionNode
	| TextNode
	| DoctypeNode
	| CommentNode
	| FragmentNode
	| FrontmatterNode;

export type {
	AttributeNode,
	CommentNode,
	ComponentNode,
	CustomElementNode,
	DoctypeNode,
	ElementNode,
	ExpressionNode,
	FragmentNode,
	FrontmatterNode,
	Node,
	ParentLikeNode,
	RootNode,
	TagLikeNode,
	TextNode,
};
