// eslint-disable-next-line node/no-missing-import
import test from 'ava';
// eslint-disable-next-line ava/no-import-test-files
import { format, markdownFormat } from './test-utils.mjs';
import { promises as fs } from 'fs';
import { fileURLToPath, URL } from 'url';

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
  t.not(src, out, 'Unformated file and formated file are the same');

  const formatted = format(src);
  t.is(formatted, out, 'Incorrect formating');
  // test that our formatting is idempotent
  const formattedTwice = format(formatted);
  t.is(formatted, formattedTwice, 'Formatting is not idempotent');
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
  t.is(src, out, 'Unformated file and formated file are not the same'); // the output should be unchanged

  const formatted = format(src);
  t.is(formatted, out, 'Incorrect formating');
  // test that our formatting is idempotent
  const formattedTwice = format(formatted);
  t.is(formatted, formattedTwice, 'Formatting is not idempotent');
};

PrettierUnaltered.title = Prettier.title;

const PrettierMarkdown = async (t, name) => {
  const [src, out] = await getMarkdownFiles(name);
  t.not(src, out, 'Unformated file and formated file are the same');

  const formatted = markdownFormat(src);
  t.is(formatted, out, 'Incorrect formating');
  // test that our formatting is idempotent
  const formattedTwice = markdownFormat(formatted);
  t.is(formatted, formattedTwice, 'Formatting is not idempotent');
};

PrettierMarkdown.title = (title, name) => `${title}:

- input: fixtures/in/${name}.md
- output: fixtures/out/${name}.md`;

test('can format a basic Astro file', Prettier, 'basic');

test('can format an Astro file with a single style element', Prettier, 'single-style-element');

test('can format a basic Astro file with styles', Prettier, 'with-styles');

test(`Can format an Astro file with attributes in the <style> tag`, Prettier, 'style-tag-attributes');

test('can format a basic Astro file with .scss styles', Prettier, 'with-scss');

test('can clean up whitespace within .sass styles (but can’t format them)', Prettier, 'with-sass');

test('can format a basic Astro file with styles written in .sass', Prettier, 'with-indented-sass');

test('can format an Astro file with frontmatter', Prettier, 'frontmatter');

test('can format an Astro file with embedded JSX expressions', Prettier, 'embedded-expr');

test('can format an Astro file with a `<!DOCTYPE html>` + embedded JSX expressions', Prettier, 'doctype-with-embedded-expr');

// note(drew): this should be fixed in new Parser. And as this is an HTML4 / deprecated / extreme edge case, probably fine to ignore?
test.failing('can format an Astro file with `<!DOCTYPE>` with extraneous attributes', Prettier, 'doctype-with-extra-attributes');

test('can format an Astro file with a JSX expression in an attribute', Prettier, 'attribute-with-embedded-expr');

test('does not alter html comments', PrettierUnaltered, 'html-comment');

test('can format an Astro file with a JSX expression and an HTML Comment', Prettier, 'expr-and-html-comment');

test('can format an Astro file containing an Astro file embedded in a codeblock', PrettierMarkdown, 'embedded-in-markdown');

test('converts valid shorthand variables into shorthand', Prettier, 'converts-to-shorthand');

test.failing('an Astro file with an invalidly unclosed tag is still formatted', Prettier, 'unclosed-tag');

test('can format an Astro file with components that are the uppercase version of html elements', Prettier, 'preserve-tag-case');

test('Autocloses open tags.', Prettier, 'autocloses-open-tags');

test('can format an Astro file with a script tag inside it', Prettier, 'with-script');

// Supports various prettier ignore comments
test('Can format an Astro file with a HTML style prettier ignore comment: https://prettier.io/docs/en/ignore.html', Prettier, 'prettier-ignore-html');

test('Can format an Astro file with a JS style prettier ignore comment: https://prettier.io/docs/en/ignore.html', Prettier, 'prettier-ignore-js');

test(`Can format an Astro file with a codespan inside <Markdown/>`, Prettier, 'with-codespans');

// note(drew): this _may_ be covered under the 'prettier-ignore-html' test. But if any bugs arise, let’s add more tests!
test.todo("properly follow prettier' advice on formatting comments");

// note(drew): I think this is a function of Astro’s parser, not Prettier. We’ll have to handle helpful error messages there!
test.todo('test whether invalid files provide helpful support messages / still try to be parsed by prettier?');
