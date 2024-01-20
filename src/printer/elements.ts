export type TagName = keyof HTMLElementTagNameMap | 'svg';

// https://github.com/prettier/prettier/blob/b77d912c0c1a5df85e3e9b5b192fc92523e411ee/vendors/html-void-elements.json
export const selfClosingTags = [
	'area',
	'base',
	'basefont',
	'bgsound',
	'br',
	'col',
	'command',
	'embed',
	'frame',
	'hr',
	'image',
	'img',
	'input',
	'isindex',
	'keygen',
	'link',
	'menuitem',
	'meta',
	'nextid',
	'param',
	'slot',
	'source',
	'track',
	'wbr',
];

// https://web.archive.org/web/20230108213516/https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements#elements
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

export const breakChildrenElements: TagName[] = ['html', 'head', 'body', 'ul', 'ol', 'select'];

/**
 * HTML attributes that we may safely reformat (trim whitespace, add or remove newlines)
 */
export const formattableAttributes: string[] = [
	// None at the moment
	// Prettier HTML does not format attributes at all
	// and to be consistent we leave this array empty for now
];
