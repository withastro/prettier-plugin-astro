import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/styles/*/*', {
	eager: true,
	as: 'raw',
});

test('Can format a basic Astro file with styles', files, 'styles/with-styles');

test(
	'Can format an Astro file with attributes in the <style> tag',
	files,
	'styles/style-tag-attributes'
);

test('Can format a basic Astro file with .scss styles', files, 'styles/with-scss');

test('Can format .sass styles', files, 'styles/with-sass');

test(
	'Can format a basic Astro file with styles written in .sass',
	files,
	'styles/with-indented-sass'
);

test('Can format nested style tag content', files, 'styles/format-nested-style-tag-content');

test(
	'Can format nested sass style tag content',
	files,
	'styles/format-nested-sass-style-tag-content'
);

test(
	'Can format a basic Astro file with styles and a body tag',
	files,
	'styles/with-styles-and-body-tag'
);

test('Can format .less styles', files, 'styles/with-less');

test('does not format unknown CSS languages', files, 'styles/with-unknown');
