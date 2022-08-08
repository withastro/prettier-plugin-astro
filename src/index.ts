import { createRequire } from 'node:module';
import { Parser, Printer, SupportLanguage } from 'prettier';
import { createSyncFn } from 'synckit';
import { options } from './options';
import { print } from './printer';
import { embed } from './printer/embed';

const req = createRequire(import.meta.url);
let workerPath;
try {
	workerPath = req.resolve('../workers/parse-worker.js');
} catch (e) {
	workerPath = req.resolve('prettier-plugin-astro/workers/parse-worker.js');
}
const parse = createSyncFn(req.resolve(workerPath));

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
		parse: (source) => parse(source),
		astFormat: 'astro',
		locStart: (node) => node.start,
		locEnd: (node) => node.end,
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
