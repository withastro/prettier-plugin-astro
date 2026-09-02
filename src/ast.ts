export const synthetic: unique symbol = Symbol.for('prettier-plugin-astro.synthetic');
export const ownChildren: unique symbol = Symbol.for('prettier-plugin-astro.ownChildren');

export interface AstroNode {
	type: string;
	start: number;
	end: number;
	[synthetic]?: boolean;
	[ownChildren]?: boolean;
	[key: string]: unknown;
}

export interface JsComment {
	type: 'Line' | 'Block';
	value: string;
	start: number;
	end: number;
}

export const astroVisitorKeys: Record<string, string[]> = {
	AstroRoot: ['frontmatter', 'template'],
	AstroFrontmatter: ['program'],
	AstroScript: ['program'],
	AstroDoctype: [],
	AstroComment: [],
};

export const isNode = (value: unknown): value is AstroNode =>
	typeof value === 'object' && value !== null && typeof (value as AstroNode).type === 'string';

export function tagNameOf(node: AstroNode): string | null {
	if (node.type !== 'JSXElement') return null;
	const name = (node.openingElement as AstroNode | undefined)?.name as AstroNode | undefined;
	return name?.type === 'JSXIdentifier' ? (name.name as string) : null;
}

/** A dotted name like `Astro.self` has no single identifier, so it is rebuilt from its parts. */
export function jsxNameOf(name: AstroNode): string | null {
	if (name.type === 'JSXIdentifier') return name.name as string;
	if (name.type !== 'JSXMemberExpression') return null;
	const object = jsxNameOf(name.object as AstroNode);
	const property = jsxNameOf(name.property as AstroNode);
	return object !== null && property !== null ? `${object}.${property}` : null;
}

export const isComponentName = (name: string | null): boolean =>
	name === null || /^[A-Z]/.test(name) || name.includes('.');

export function attributesOf(node: AstroNode): AstroNode[] {
	const opening = node.openingElement as AstroNode | undefined;
	return (opening?.attributes as AstroNode[] | undefined) ?? [];
}

export function attributeNamed(node: AstroNode, name: string): AstroNode | undefined {
	return attributesOf(node).find(
		(attribute) => attribute.type === 'JSXAttribute' && (attribute.name as AstroNode).name === name,
	);
}

export function attributeStringValue(node: AstroNode, name: string): string | null {
	const value = attributeNamed(node, name)?.value as AstroNode | undefined;
	return value?.type === 'Literal' && typeof value.value === 'string' ? value.value : null;
}

export const hasAttribute = (node: AstroNode, name: string): boolean =>
	attributeNamed(node, name) !== undefined;

export const hasSetDirective = (node: AstroNode): boolean =>
	hasAttribute(node, 'set:html') || hasAttribute(node, 'set:text');

export function childrenOf(node: AstroNode): AstroNode[] | null {
	if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
		return (node.astroChildren as AstroNode[] | undefined) ?? (node.children as AstroNode[]);
	}
	return null;
}

/** Prettier's JSX printer prints a lone template-literal child verbatim: the only seam for our own children doc. */
export function takeOverChildren(node: AstroNode): void {
	const children = node.children as AstroNode[];
	if (children.length === 0) return;
	node.astroChildren = children;
	node.children = [
		{
			type: 'JSXExpressionContainer',
			start: node.start,
			end: node.end,
			[ownChildren]: true,
			expression: {
				type: 'TemplateLiteral',
				start: node.start,
				end: node.end,
				quasis: [],
				expressions: [],
			},
		},
	];
}

export function walk(node: unknown, visit: (node: AstroNode) => void): void {
	if (Array.isArray(node)) {
		for (const item of node) walk(item, visit);
		return;
	}
	if (!isNode(node)) return;
	visit(node);
	for (const key of Object.keys(node)) {
		if (key !== 'type') walk(node[key], visit);
	}
}
