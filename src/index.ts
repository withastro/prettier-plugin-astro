import { parse } from '@astrojs/compiler/sync';
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
		parse: (source) => parse(source, { position: true }).ast,
		astFormat: 'astro',
		locStart: (node) => node.position.start.offset,
		locEnd: (node) => node.position.end.offset,
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

export { options, defaultOptions };
