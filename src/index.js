const parse = require('./parse');
const printer = require('./printer');
const { options } = require('./options');

/** @type {Partial<import('prettier').SupportLanguage>[]} */
const languages = [
  {
    name: 'astro',
    parsers: ['astro'],
    extensions: ['.astro'],
    vscodeLanguageIds: ['astro'],
  },
];

/** @type {Record<string, import('prettier').Parser>} */
const parsers = {
  astro: {
    parse,
    astFormat: 'astro',
    locStart: (node) => node.start,
    locEnd: (node) => node.end,
  },
};

/** @type {Record<string, import('prettier').Printer>} */
const printers = {
  astro: printer,
};

module.exports = {
  languages,
  printers,
  parsers,
  options,
  defaultOptions: {
    tabWidth: 2,
  },
};
