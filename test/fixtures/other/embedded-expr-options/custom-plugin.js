import * as astro from '../../../../dist/index.js';

let original = astro.parsers.astroExpressionParser;

export const options = {
	customPluginClass: {
		since: '1.0.0',
		category: 'foo',
		type: 'string',
		default: 'my-default-class',
		description: 'Replace all classes with this one.',
	},
};

export const parsers = {
	astroExpressionParser: {
		...original,
		parse(text, options) {
			let ast = original.parse(text, options);

			let nodes = [ast.program];
			while (nodes.length) {
				let node = nodes.shift();
				switch (node.type) {
					case 'Program':
						nodes.push(...node.body);
						break;
					case 'ExpressionStatement':
						nodes.push(node.expression);
						break;
					case 'JSXExpressionContainer':
						nodes.push(node.expression);
						break;
					case 'JSXFragment':
						nodes.push(...node.children);
						break;
					case 'JSXElement':
						nodes.push(node.openingElement);
						nodes.push(...node.children);
						break;
					case 'JSXOpeningElement':
						nodes.push(...node.attributes);
						break;
					case 'JSXAttribute':
						if (node.name && node.name.type === 'JSXIdentifier' && node.name.name === 'class') {
							node.value.value = `${options.customPluginClass}`;
							node.value.extra = {
								rawValue: node.value.value,
								raw: `"${node.value.value}"`,
							};
						}
						break;
				}
			}

			return ast;
		},
	},
};
