import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/return/*/*', {
	eager: true,
	as: 'raw',
});

test('Can format an Astro file with top-level return', files, 'return/return-basic');

test(
	'Can format an Astro file with top-level return with prettier "semi: false" option',
	files,
	'return/return-semicolon-false'
);

test(
	'Can format an Astro file with top-level return with prettier "singleQuote: true" option',
	files,
	'return/return-single-quote-true'
);

test(
	'Can format an Astro file with top-level return with prettier "trailingComma: all" option',
	files,
	'return/return-trailing-comma-all'
);

test(
	'Can format an Astro file with top-level return with prettier "trailingComma: none" option',
	files,
	'return/return-trailing-comma-none'
);

test(
	'Can format an Astro file with top-level return with prettier "bracketSpacing: false" option',
	files,
	'return/return-bracket-spacing-false'
);

test(
	'Can format an Astro file with top-level return with prettier "arrowParens: avoid" option',
	files,
	'return/return-arrow-parens-avoid'
);
