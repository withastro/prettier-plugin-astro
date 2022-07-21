import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/markdown/*/*', {
	assert: { type: 'raw' },
});

// This test is currently disabled because a bug moves a style tag when it shouldn't
/* test(
	'can format an Astro file containing an Astro file embedded in a codeblock',
	files,
	'markdown/embedded-in-markdown',
	true
); */
