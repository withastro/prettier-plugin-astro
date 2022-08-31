import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/options/*/*', {
	eager: true,
	as: 'raw',
});

// https://prettier.io/docs/en/options.html#print-width
// TODO: MAYBE NOT WORKING?
test(
	'Can format an Astro file with prettier "printWidth" option',
	files,
	'options/option-print-width'
);

// https://prettier.io/docs/en/options.html#tab-width
test('Can format an Astro file with prettier "tabWidth" option', files, 'options/option-tab-width');

// https://prettier.io/docs/en/options.html#tabs
test(
	'Can format an Astro file with prettier "useTabs: true" option',
	files,
	'options/option-use-tabs-true'
);

// https://prettier.io/docs/en/options.html#tabs
test(
	'Can format an Astro file with prettier "useTabs: false" option',
	files,
	'options/option-use-tabs-false'
);

// https://prettier.io/docs/en/options.html#semicolons
test(
	'Can format an Astro file with prettier "semi: true" option',
	files,
	'options/option-semicolon-true'
);

// https://prettier.io/docs/en/options.html#semicolons
test(
	'Can format an Astro file with prettier "semi: false" option',
	files,
	'options/option-semicolon-false'
);

// https://prettier.io/docs/en/options.html#quotes
test(
	'Can format an Astro file with prettier "singleQuote: false" option',
	files,
	'options/option-single-quote-false'
);

// https://prettier.io/docs/en/options.html#quotes
test(
	'Can format an Astro file with prettier "singleQuote: true" option',
	files,
	'options/option-single-quote-true'
);

// https://prettier.io/docs/en/options.html#quote-props
test(
	'Can format an Astro file with prettier "quoteProps: as-needed" option',
	files,
	'options/option-quote-props-as-needed'
);

// https://prettier.io/docs/en/options.html#quote-props
test(
	'Can format an Astro file with prettier "quoteProps: consistent" option',
	files,
	'options/option-quote-props-consistent'
);

// https://prettier.io/docs/en/options.html#quote-props
test(
	'Can format an Astro file with prettier "quoteProps: preserve" option',
	files,
	'options/option-quote-props-preserve'
);

// https://prettier.io/docs/en/options.html#jsx-quotes
test(
	'Can format an Astro file with prettier "jsxSingleQuote: false" option',
	files,
	'options/option-jsx-single-quote-false'
);

// https://prettier.io/docs/en/options.html#jsx-quotes
test(
	'Can format an Astro file with prettier "jsxSingleQuote: true" option',
	files,
	'options/option-jsx-single-quote-true'
);

// https://prettier.io/docs/en/options.html#trailing-commas
test(
	'Can format an Astro file with prettier "trailingComma: es5" option',
	files,
	'options/option-trailing-comma-es5'
);

// https://prettier.io/docs/en/options.html#trailing-commas
test(
	'Can format an Astro file with prettier "trailingComma: none" option',
	files,
	'options/option-trailing-comma-none'
);

// https://prettier.io/docs/en/options.html#bracket-spacing
test(
	'Can format an Astro file with prettier "bracketSpacing: true" option',
	files,
	'options/option-bracket-spacing-true'
);

// https://prettier.io/docs/en/options.html#bracket-spacing
test(
	'Can format an Astro file with prettier "bracketSpacing: false" option',
	files,
	'options/option-bracket-spacing-false'
);

// https://prettier.io/docs/en/options.html#bracket-line
test(
	'Can format an Astro file with prettier "bracketSameLine: false" option',
	files,
	'options/option-bracket-same-line-false'
);

// https://prettier.io/docs/en/options.html#bracket-line
test(
	'Can format an Astro file with prettier "bracketSameLine: true" option',
	files,
	'options/option-bracket-same-line-true'
);

// https://prettier.io/docs/en/options.html#arrow-function-parentheses
test(
	'Can format an Astro file with prettier "arrowParens: always" option',
	files,
	'options/option-arrow-parens-always'
);

// https://prettier.io/docs/en/options.html#arrow-function-parentheses
test(
	'Can format an Astro file with prettier "arrowParens: avoid" option',
	files,
	'options/option-arrow-parens-avoid'
);

// https://prettier.io/docs/en/options.html#prose-wrap
test(
	'Can format an Astro file with prettier "proseWrap: preserve" option',
	files,
	'options/option-prose-wrap-preserve',
	true
);

// https://prettier.io/docs/en/options.html#prose-wrap
test(
	'Can format an Astro file with prettier "proseWrap: always" option',
	files,
	'options/option-prose-wrap-always',
	true
);

// https://prettier.io/docs/en/options.html#prose-wrap
test(
	'Can format an Astro file with prettier "proseWrap: never" option',
	files,
	'options/option-prose-wrap-never',
	true
);

// // https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
// test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: css" option',  'option-html-whitespace-sensitivity-css');

// // https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
// test('Can format an Astro file with prettier "htmlWhitespaceSensitivity: strict" option',  'option-html-whitespace-sensitivity-strict');

// https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
test(
	'Can format an Astro file with prettier "htmlWhitespaceSensitivity: ignore" option',
	files,
	'options/option-html-whitespace-sensitivity-ignore'
);

// https://prettier.io/docs/en/options.html#single-attribute-per-line
test(
	'Can format an Astro file with prettier "singleAttributePerLine: true" option',
	files,
	'options/single-attribute-per-line-true'
);

// https://prettier.io/docs/en/options.html#single-attribute-per-line
test(
	'Can format an Astro file with prettier "singleAttributePerLine: false" option',
	files,
	'options/single-attribute-per-line-false'
);

// // astro option: astroSortOrder
// test('Can format an Astro file with prettier "astroSortOrder: markup | styles" option',  'option-astro-sort-order-markup-styles');

// // astro option: astroSortOrder
// test('Can format an Astro file with prettier "astroSortOrder: styles | markup" option',  'option-astro-sort-order-styles-markup');

// // astro option: astroAllowShorthand
// test('Can format an Astro file with prettier "astroAllowShorthand: true" option',  'option-astro-allow-shorthand-true');

// // astro option: astroAllowShorthand
// test('Can format an Astro file with prettier "astroAllowShorthand: false" option',  'option-astro-allow-shorthand-false');
