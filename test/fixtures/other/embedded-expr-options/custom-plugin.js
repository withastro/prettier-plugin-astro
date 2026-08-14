import * as astro from '../../../../dist/index.js';

const original = astro.parsers.astro;

export const options = {
	customPluginClass: {
		since: '1.0.0',
		category: 'foo',
		type: 'string',
		default: 'my-default-class',
		description: 'Replace all classes with this one.',
	},
};

function rewriteClasses(node, className) {
	if (Array.isArray(node)) {
		for (const item of node) rewriteClasses(item, className);
		return;
	}
	if (typeof node !== 'object' || node === null) return;
	if (node.type === 'JSXAttribute' && node.name?.name === 'class' && node.value) {
		node.value.value = className;
		node.value.raw = `"${className}"`;
	}
	for (const key of Object.keys(node)) {
		if (key !== 'type') rewriteClasses(node[key], className);
	}
}

export const parsers = {
	astro: {
		...original,
		parse(text, options) {
			const ast = original.parse(text, options);
			rewriteClasses(ast, options.customPluginClass);
			return ast;
		},
	},
};
