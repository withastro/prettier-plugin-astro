import { test } from '../test-utils';

test('can format an Astro file with frontmatter', 'frontmatter');

test('can format an Astro file with embedded JSX expressions', 'embedded-expr');

test(
  'can format an Astro file with a `<!DOCTYPE html>` + embedded JSX expressions',
  'doctype-with-embedded-expr'
);

// // note(drew): this should be fixed in new Parser. And as this is an HTML4 / deprecated / extreme edge case, probably fine to ignore?
// test.failing('can format an Astro file with `<!DOCTYPE>` with extraneous attributes', Prettier, 'doctype-with-extra-attributes');

test('can format an Astro file with fragments', 'fragment');

test(
  'can format an Astro file with a JSX expression in an attribute',
  'attribute-with-embedded-expr'
);

test('does not alter html comments', 'html-comment', { mode: 'unaltered' });

test(
  'can format an Astro file with a JSX expression and an HTML Comment',
  'expr-and-html-comment'
);

// test.failing('an Astro file with an invalidly unclosed tag is still formatted', Prettier, 'unclosed-tag');

test(
  'can format an Astro file with components that are the uppercase version of html elements',
  'preserve-tag-case'
);

test('Autocloses open tags.', 'autocloses-open-tags');

test('can format an Astro file with a script tag inside it', 'with-script');

// // Supports various prettier ignore comments
// test('Can format an Astro file with a HTML style prettier ignore comment: https://prettier.io/docs/en/ignore.html', Prettier, 'prettier-ignore-html');

test(
  'Can format an Astro file with a JS style prettier ignore comment: https://prettier.io/docs/en/ignore.html',
  'prettier-ignore-js'
);

// // note(drew): this _may_ be covered under the 'prettier-ignore-html' test. But if any bugs arise, let’s add more tests!
// test.todo("properly follow prettier' advice on formatting comments");

// // note(drew): I think this is a function of Astro’s parser, not Prettier. We’ll have to handle helpful error messages there!
// test.todo('test whether invalid files provide helpful support messages / still try to be parsed by prettier?');

test('Format spread operator', 'spread-operator');

test('Can format nested comment', 'nested-comment');

test('format binary expressions', 'binary-expression');

test('format directives', 'directive');
