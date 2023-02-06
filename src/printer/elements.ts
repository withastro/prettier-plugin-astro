export type TagName = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap;

export const selfClosingTags: TagName[] = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'image',
	'img',
	'input',
	'link',
	'meta',
	'slot',
	'source',
	'track',
	'wbr',

	// The SVG spec doesn't really have a concept of void elements, everything is allowed
	// However, some tags are very commonly self-closed by users, and as such they find it confusing for them to not be closed
	'circle',
	'ellipse',
	'line',
	'path',
	'polygon',
	'polyline',
	'rect',
	'stop',
	'use',

	// Filters
	'feBlend',
	'feColorMatrix',
	'feComponentTransfer',
	'feComposite',
	'feConvolveMatrix',
	'feDiffuseLighting',
	'feDisplacementMap',
	'feFlood',
	'feGaussianBlur',
	'feMerge',
	'feMorphology',
	'feOffset',
	'feSpecularLighting',
	'feTile',
	'feTurbulence',
];

// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements#Elements
export const blockElements: TagName[] = [
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
];

/**
 * HTML attributes that we may safely reformat (trim whitespace, add or remove newlines)
 */
export const formattableAttributes: string[] = [
	// None at the moment
	// Prettier HTML does not format attributes at all
	// and to be consistent we leave this array empty for now
];
