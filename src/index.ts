import { parse } from '@astrojs/compiler';
import { Parser, Printer, SupportLanguage } from 'prettier';

import { options } from './options';
import { print } from './printer';
import { embed } from './printer/embed';

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
		async parse(source) {
			const { ast } = await parse(source);
			return ast;
		},
		astFormat: 'astro',
		locStart: (node) => node.start,
		locEnd: (node) => node.end,
	},
};

// https://prettier.io/docs/en/plugins.html#printers
export const printers = {
	astro: {
		print,
		embed,
	},
};

const defaultOptions = {
	tabWidth: 2,
};

export { options, defaultOptions };
