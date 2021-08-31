import test from 'ava';
import { format, markdownFormat } from './test-utils.mjs';
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

const getMarkdownFiles = async (name) => {
  const [src, out] = await Promise.all([readFile(`/in/${name}.md`), readFile(`/out/${name}.md`)]);
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
  // test that our formatting is idempotent
  const formattedTwice = format(formatted);
  t.is(formatted, formattedTwice);
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
  // test that our formatting is idempotent
  const formattedTwice = format(formatted);
  t.is(formatted, formattedTwice);
};

PrettierUnaltered.title = Prettier.title;

test('can format a basic Astro file', Prettier, 'basic');

test('can format an Astro file with a single style element', Prettier, 'single-style-element');

test('can format a basic Astro file with styles', Prettier, 'with-styles');

test('can format an Astro file with frontmatter', Prettier, 'frontmatter');

test('can format an Astro file with embedded JSX expressions', Prettier, 'embedded-expr');

test('can format an Astro file with a JSX expression in an attribute', Prettier, 'attribute-with-embedded-expr');

test('does not alter html comments', PrettierUnaltered, 'html-comment');

test.todo("properly follow prettier' advice on formatting comments");

test('can format an Astro file with a JSX expression and an HTML Comment', Prettier, 'expr-and-html-comment');

test(
  'can format an Astro file containing an Astro file embedded in a codeblock',
  async (t, name) => {
    const [src, out] = await getMarkdownFiles(name);
    t.not(src, out);

    const formatted = markdownFormat(src);
    t.not(formatted, out);
    // test that our formatting is idempotent
    const formattedTwice = markdownFormat(formatted);
    t.is(formatted, formattedTwice);
  },
  'embedded-in-markdown'
);

test.todo('test whether attributes that can be translated into shortcodes are converted.');

test.failing('an Astro file with an invalidly unclosed tag is still formatted', Prettier, 'unclosed-tag');

test.todo('test whether invalid files provide helpful support messages / still try to be parsed by prettier?');

test.failing('can format an Astro file with components that are the uppercase version of html elements', PrettierUnaltered, 'preserve-tag-case');

test.failing('BUG: RangeError { message: "Maximum call stack size exceeded" }', PrettierUnaltered, 'maximum-call-size-exceeded');

test.todo('can format an Astro file with a script tag inside it');

test.todo('Can format an Astro file with a HTML style prettier ignore comment: https://prettier.io/docs/en/ignore.html');

test.todo('Can format an Astro file with a JS style prettier ignore comment: https://prettier.io/docs/en/ignore.html');
