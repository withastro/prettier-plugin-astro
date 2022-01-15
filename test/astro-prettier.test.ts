import test from 'ava';
import { Prettier, PrettierMarkdown, PrettierUnaltered } from './test-utils.js';

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

// https://prettier.io/docs/en/options.html#print-width
test('Can format an Astro file with prettier "printWidth" option', Prettier, 'option-print-width');

// https://prettier.io/docs/en/options.html#tab-width
test('Can format an Astro file with prettier "tabWidth" option', Prettier, 'option-tab-width');

// https://prettier.io/docs/en/options.html#tabs
test('Can format an Astro file with prettier "useTabs: true" option', Prettier, 'option-use-tabs-true');

// https://prettier.io/docs/en/options.html#tabs
test('Can format an Astro file with prettier "useTabs: false" option', Prettier, 'option-use-tabs-false');

// https://prettier.io/docs/en/options.html#semicolons
test('Can format an Astro file with prettier "semi: true" option', Prettier, 'option-semicolon-true');

// https://prettier.io/docs/en/options.html#semicolons
test('Can format an Astro file with prettier "semi: false" option', Prettier, 'option-semicolon-false');

// https://prettier.io/docs/en/options.html#quotes
test('Can format an Astro file with prettier "singleQuote: false" option', Prettier, 'option-single-quote-false');

// https://prettier.io/docs/en/options.html#quotes
test('Can format an Astro file with prettier "singleQuote: true" option', Prettier, 'option-single-quote-true');

// https://prettier.io/docs/en/options.html#quote-props
test('Can format an Astro file with prettier "quoteProps: as-needed" option', Prettier, 'option-quote-props-as-needed');

// https://prettier.io/docs/en/options.html#quote-props
test('Can format an Astro file with prettier "quoteProps: consistent" option', Prettier, 'option-quote-props-consistent');

// https://prettier.io/docs/en/options.html#quote-props
test('Can format an Astro file with prettier "quoteProps: preserve" option', Prettier, 'option-quote-props-preserve');

// https://prettier.io/docs/en/options.html#jsx-quotes
test('Can format an Astro file with prettier "jsxSingleQuote: false" option', Prettier, 'option-jsx-single-quote-false');

// https://prettier.io/docs/en/options.html#jsx-quotes
test('Can format an Astro file with prettier "jsxSingleQuote: true" option', Prettier, 'option-jsx-single-quote-true');

// https://prettier.io/docs/en/options.html#trailing-commas
test('Can format an Astro file with prettier "trailingComma: es5" option', Prettier, 'option-trailing-comma-es5');

// https://prettier.io/docs/en/options.html#trailing-commas
test('Can format an Astro file with prettier "trailingComma: none" option', Prettier, 'option-trailing-comma-none');

// https://prettier.io/docs/en/options.html#bracket-spacing
test('Can format an Astro file with prettier "bracketSpacing: true" option', Prettier, 'option-bracket-spacing-true');

// https://prettier.io/docs/en/options.html#bracket-spacing
test('Can format an Astro file with prettier "bracketSpacing: false" option', Prettier, 'option-bracket-spacing-false');

// https://prettier.io/docs/en/options.html#bracket-line
test('Can format an Astro file with prettier "bracketSameLine: false" option', Prettier, 'option-bracket-same-line-false');

// https://prettier.io/docs/en/options.html#bracket-line
test('Can format an Astro file with prettier "bracketSameLine: true" option', Prettier, 'option-bracket-same-line-true');

// https://prettier.io/docs/en/options.html#arrow-function-parentheses
test('Can format an Astro file with prettier "arrowParens: always" option', Prettier, 'option-arrow-parens-always');

// https://prettier.io/docs/en/options.html#arrow-function-parentheses
test('Can format an Astro file with prettier "arrowParens: avoid" option', Prettier, 'option-arrow-parens-avoid');

// https://prettier.io/docs/en/options.html#prose-wrap
test('Can format an Astro file with prettier "proseWrap: preserve" option', PrettierMarkdown, 'option-prose-wrap-preserve');

// https://prettier.io/docs/en/options.html#prose-wrap
test('Can format an Astro file with prettier "proseWrap: always" option', PrettierMarkdown, 'option-prose-wrap-always');

// https://prettier.io/docs/en/options.html#prose-wrap
test('Can format an Astro file with prettier "proseWrap: never" option', PrettierMarkdown, 'option-prose-wrap-never');

// https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: css" option', Prettier, 'option-html-whitespace-sensitivity-css');

// https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: strict" option', Prettier, 'option-html-whitespace-sensitivity-strict');

// https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: ignore" option', Prettier, 'option-html-whitespace-sensitivity-ignore');

// astro option: astroSortOrder
test('Can format an Astro file with prettier "astroSortOrder: markup | styles" option', Prettier, 'option-astro-sort-order-markup-styles');

// astro option: astroSortOrder
test('Can format an Astro file with prettier "astroSortOrder: styles | markup" option', Prettier, 'option-astro-sort-order-styles-markup');

// astro option: astroAllowShorthand
test('Can format an Astro file with prettier "astroAllowShorthand: true" option', Prettier, 'option-astro-allow-shorthand-true');

// astro option: astroAllowShorthand
test('Can format an Astro file with prettier "astroAllowShorthand: false" option', Prettier, 'option-astro-allow-shorthand-false');

test('Format spread operator', Prettier, 'spread-operator');

test('Can format nested style tag content', Prettier, 'format-nested-style-tag-content');

test('Can format nested sass style tag content', Prettier, 'format-nested-sass-style-tag-content');

test('Can format the content of a markdown component as markdown', Prettier, 'markdown-component-content');

test.todo("Don't escape '*' inside markdown");

test.todo('Format jsx inside markdown');

test('Can format nested comment', Prettier, 'nested-comment');
