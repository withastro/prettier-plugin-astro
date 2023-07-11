import { parse } from '@astrojs/compiler/sync';
import type { Parser, Printer, SupportLanguage } from 'prettier';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import { options } from './options';
import { print } from './printer';
import { embed } from './printer/embed';

const babelParser = prettierPluginBabel.parsers['babel-ts'];

// https://prettier.io/docs/en/plugins.html#languages
export const languages: Partial<SupportLanguage>[] = [
	{
		name: 'astro',
		parsers: ['astro'],
		extensions: ['.astro'],
		vscodeLanguageIds: ['astro'],
	},
];

// https://prettier.io/docs/en/plugins.html#parsers
export const parsers: Record<string, Parser> = {
	astro: {
		parse: (source) => parse(source, { position: true }).ast,
		astFormat: 'astro',
		locStart: (node) => node.position.start.offset,
		locEnd: (node) => node.position.end.offset,
	},
	astroExpressionParser: {
		...babelParser,
		preprocess(text) {
			// note the trailing newline: if the statement ends in a // comment,
			// we can't add the closing bracket right afterwards
			return `<>{${text}\n}</>`;
		},
		parse(text, opts) {
			const ast = babelParser.parse(text, opts);

			return {
				...ast,
				program: ast.program.body[0].expression.children[0].expression,
			};
		},
	},
};

// https://prettier.io/docs/en/plugins.html#printers
export const printers: Record<string, Printer> = {
	astro: {
		print,
		embed,
	},
};

const defaultOptions = {
	tabWidth: 2,
};

export { defaultOptions, options };
