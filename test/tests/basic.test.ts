import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/basic/*/*', {
  assert: { type: 'raw' },
});

test('can format a basic astro file', files, 'basic/basic-html');

test(
  'can format an Astro file with a single style element',
  files,
  'basic/single-style-element'
);
