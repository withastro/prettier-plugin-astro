import { createRequire } from 'node:module';
import { Parser, Printer, SupportLanguage } from 'prettier';
import { createSyncFn } from 'synckit';
import { options } from './options';
import { print } from './printer';
import { embed } from './printer/embed';

const require = createRequire(import.meta.url);
// the worker path must be absolute
const parse = createSyncFn(require.resolve('../workers/parse-worker.js'));

export const languages: Partial<SupportLanguage>[] = [
	{
		name: 'astro',
		parsers: ['astro'],
		extensions: ['.astro'],
		vscodeLanguageIds: ['astro'],
	},
];

export const parsers: Record<string, Parser> = {
	astro: {
		parse: (source) => parse(source),
		astFormat: 'astro',
		locStart: (node) => node.start,
		locEnd: (node) => node.end,
	},
};

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
