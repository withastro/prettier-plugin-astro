import type { Parser, Printer, SupportLanguage } from 'prettier';
import type { AstroNode } from './ast';
import { options } from './options';
import { parse } from './parser';
import { printer } from './printer';

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
		parse,
		astFormat: 'astro',
		locStart: (node: AstroNode) => node.start,
		locEnd: (node: AstroNode) => node.end,
	},
};

// https://prettier.io/docs/en/plugins.html#printers
export const printers: Record<string, Printer> = {
	// Prettier types `print`'s callback as taking an `AstPath`, but it passes one taking a selector.
	astro: printer as unknown as Printer,
};

const defaultOptions = {
	tabWidth: 2,
};

export { defaultOptions, options };
