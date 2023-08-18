import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/basic/*/*', {
	eager: true,
	as: 'raw',
});

test('Can format a basic astro file', files, 'basic/basic-html');

test('Can format an Astro file with a single style element', files, 'basic/single-style-element');

test('Can format a basic astro only text', files, 'basic/simple-text');

test('Can format html comments', files, 'basic/html-comment');

test('Can format HTML custom elements', files, 'basic/html-custom-elements');

test('Can properly format the class attribute', files, 'basic/html-class-attribute');

test(
	'Can properly format the class attribute with line breaks',
	files,
	'basic/html-class-attribute-with-line-breaks'
);

test('Can format long self-closing tags with multiple attributes', files, 'basic/self-closing');

test('Can properly format inline tags and respect whitespace', files, 'basic/inline-whitespace');
