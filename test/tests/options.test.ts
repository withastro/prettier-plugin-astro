import { test } from '../test-utils';

// https://prettier.io/docs/en/options.html#print-width
test(
  'Can format an Astro file with prettier "printWidth" option',
  'option-print-width'
);

// https://prettier.io/docs/en/options.html#tab-width
test(
  'Can format an Astro file with prettier "tabWidth" option',
  'option-tab-width'
);

// https://prettier.io/docs/en/options.html#tabs
test(
  'Can format an Astro file with prettier "useTabs: true" option',
  'option-use-tabs-true'
);

// https://prettier.io/docs/en/options.html#tabs
test(
  'Can format an Astro file with prettier "useTabs: false" option',
  'option-use-tabs-false'
);

// https://prettier.io/docs/en/options.html#semicolons
test(
  'Can format an Astro file with prettier "semi: true" option',
  'option-semicolon-true'
);

// https://prettier.io/docs/en/options.html#semicolons
test(
  'Can format an Astro file with prettier "semi: false" option',
  'option-semicolon-false'
);

// // https://prettier.io/docs/en/options.html#quotes
// test('Can format an Astro file with prettier "singleQuote: false" option',  'option-single-quote-false');

// // https://prettier.io/docs/en/options.html#quotes
// test('Can format an Astro file with prettier "singleQuote: true" option',  'option-single-quote-true');

// https://prettier.io/docs/en/options.html#quote-props
test(
  'Can format an Astro file with prettier "quoteProps: as-needed" option',
  'option-quote-props-as-needed'
);

// https://prettier.io/docs/en/options.html#quote-props
test(
  'Can format an Astro file with prettier "quoteProps: consistent" option',
  'option-quote-props-consistent'
);

// https://prettier.io/docs/en/options.html#quote-props
test(
  'Can format an Astro file with prettier "quoteProps: preserve" option',
  'option-quote-props-preserve'
);

// // https://prettier.io/docs/en/options.html#jsx-quotes
// test('Can format an Astro file with prettier "jsxSingleQuote: false" option',  'option-jsx-single-quote-false');

// // https://prettier.io/docs/en/options.html#jsx-quotes
// test('Can format an Astro file with prettier "jsxSingleQuote: true" option',  'option-jsx-single-quote-true');

// https://prettier.io/docs/en/options.html#trailing-commas
test(
  'Can format an Astro file with prettier "trailingComma: es5" option',
  'option-trailing-comma-es5'
);

// https://prettier.io/docs/en/options.html#trailing-commas
test(
  'Can format an Astro file with prettier "trailingComma: none" option',
  'option-trailing-comma-none'
);

// https://prettier.io/docs/en/options.html#bracket-spacing
test(
  'Can format an Astro file with prettier "bracketSpacing: true" option',
  'option-bracket-spacing-true'
);

// https://prettier.io/docs/en/options.html#bracket-spacing
test(
  'Can format an Astro file with prettier "bracketSpacing: false" option',
  'option-bracket-spacing-false'
);

// https://prettier.io/docs/en/options.html#bracket-line
test(
  'Can format an Astro file with prettier "bracketSameLine: false" option',
  'option-bracket-same-line-false'
);

// https://prettier.io/docs/en/options.html#bracket-line
test(
  'Can format an Astro file with prettier "bracketSameLine: true" option',
  'option-bracket-same-line-true'
);

// https://prettier.io/docs/en/options.html#arrow-function-parentheses
test(
  'Can format an Astro file with prettier "arrowParens: always" option',
  'option-arrow-parens-always'
);

// https://prettier.io/docs/en/options.html#arrow-function-parentheses
test(
  'Can format an Astro file with prettier "arrowParens: avoid" option',
  'option-arrow-parens-avoid'
);

// https://prettier.io/docs/en/options.html#prose-wrap
test(
  'Can format an Astro file with prettier "proseWrap: preserve" option',
  'option-prose-wrap-preserve',
  { mode: 'markdown' }
);

// https://prettier.io/docs/en/options.html#prose-wrap
test(
  'Can format an Astro file with prettier "proseWrap: always" option',
  'option-prose-wrap-always',
  { mode: 'markdown' }
);

// https://prettier.io/docs/en/options.html#prose-wrap
test(
  'Can format an Astro file with prettier "proseWrap: never" option',
  'option-prose-wrap-never',
  { mode: 'markdown' }
);

// // https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
// test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: css" option',  'option-html-whitespace-sensitivity-css');

// // https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
// test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: strict" option',  'option-html-whitespace-sensitivity-strict');

// https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
test(
  'Can format an Astro file with prettier "htmlWhitespaceSensitivity: ignore" option',
  'option-html-whitespace-sensitivity-ignore'
);

// // astro option: astroSortOrder
// test('Can format an Astro file with prettier "astroSortOrder: markup | styles" option',  'option-astro-sort-order-markup-styles');

// // astro option: astroSortOrder
// test('Can format an Astro file with prettier "astroSortOrder: styles | markup" option',  'option-astro-sort-order-styles-markup');

// // astro option: astroAllowShorthand
// test('Can format an Astro file with prettier "astroAllowShorthand: true" option',  'option-astro-allow-shorthand-true');

// // astro option: astroAllowShorthand
// test('Can format an Astro file with prettier "astroAllowShorthand: false" option',  'option-astro-allow-shorthand-false');
