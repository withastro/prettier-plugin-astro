import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/markdown/*/*', {
	eager: true,
	as: 'raw',
});

test(
	'can format an Astro file containing an Astro file embedded in a codeblock',
	files,
	'markdown/embedded-in-markdown',
	true
);
