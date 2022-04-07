import { test } from '../test-utils';

const files = import.meta.glob('/test/fixtures/markdown/*/*', {
  assert: { type: 'raw' },
});

// *** MARKDOWN ***
// test(
//   'can format an Astro file containing an Astro file embedded in a codeblock',
//   files,
//   'markdown/embedded-in-markdown',
//   { mode: 'markdown' }
// );

test(
  'Can format an Astro file with a codespan inside <Markdown/>',
  files,
  'markdown/with-codespans'
);

test(
  'Can format the content of a markdown component as markdown',
  files,
  'markdown/markdown-component-content'
);

// test.todo("Don't escape '*' inside markdown");

// test.todo('Format jsx inside markdown');
