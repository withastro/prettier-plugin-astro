import parse from './parse';
import printer from './printer';
import { options } from './options';
import { Parser, Printer, SupportLanguage } from 'prettier';

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
    parse,
    astFormat: 'astro',
    locStart: (node) => node.start,
    locEnd: (node) => node.end,
  },
};

export const printers: Record<string, Printer> = {
  astro: printer,
};

const defaultOptions = {
  tabWidth: 2,
};

export { options, defaultOptions };
