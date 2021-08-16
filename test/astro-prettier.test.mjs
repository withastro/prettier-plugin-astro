import test from 'ava';
import { format } from './test-utils.mjs';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const readFile = (path) => fs.readFile(fileURLToPath(new URL(`./fixtures${path}`, import.meta.url))).then((res) => res.toString().replace(/\r\n/g, '\n'));

/**
 * Utility to get `[src, out]` files
 * @param name {string}
 * @param ctx {any}
 */
const getFiles = async (name) => {
  const [src, out] = await Promise.all([readFile(`/in/${name}.astro`), readFile(`/out/${name}.astro`)]);
  return [src, out];
};

/**
 * Macro for testing fixtures
 * @param t {TestInterface<unknown>}
 * @param name {string}
 */
const Prettier = async (t, name) => {
  const [src, out] = await getFiles(name);
  t.not(src, out);

  const formatted = format(src);
  t.is(formatted, out);
};

/**
 * Macro title function for nice formatting
 * @param title {string}
 * @param name {string}
 * @returns {string}
 */
Prettier.title = (title, name) => `${title}:

  - input: fixtures/in/${name}.astro
  - output: fixtures/out/${name}.astro`;

const PrettierUnaltered = async (t, name) => {
  const [src, out] = await getFiles(name);
  t.is(src, out); // the output should be unchanged

  const formatted = format(src);
  t.is(formatted, out);
};

PrettierUnaltered.title = Prettier.title;

test.failing('can format a basic Astro file', Prettier, 'basic');

test.failing('can format a basic Astro file with styles', Prettier, 'with-styles');

test('can format an Astro file with frontmatter', Prettier, 'frontmatter');

test('can format an Astro file with embedded JSX expressions', Prettier, 'embedded-expr');

test('can format an Astro file with a JSX expression in an attribute', Prettier, 'attribute-with-embedded-expr');

test.only('does not alter html comments', PrettierUnaltered, 'html-comment');

test('can format an Astro file with a JSX expression and an HTML Comment', Prettier, 'expr-and-html-comment');

test.failing('can format an Astro file with a single style element', Prettier, 'single-style-element');
