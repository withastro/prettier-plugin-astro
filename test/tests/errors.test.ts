import { expect, it } from 'vitest';
import { format } from '../test-utils';

const files = import.meta.glob('/test/fixtures/errors/**/*', {
	assert: { type: 'raw' },
});

function getFile(allFiles: any, path: string): string {
	return allFiles[path];
}

it('Correctly errors when parsing faulty frontmatter', async () => {
	const content = getFile(files, '/test/fixtures/errors/frontmatter.astro');
	expect(() => format(content, {})).toThrowError('Expression expected');
});

it('Correctly errors when parsing faulty expressions', async () => {
	const content = getFile(files, '/test/fixtures/errors/expression.astro');
	expect(() => format(content, {})).toThrowError('Unexpected token');
});

it('Correctly errors when parsing faulty attributes with expression', async () => {
	const content = getFile(files, '/test/fixtures/errors/attribute.astro');
	expect(() => format(content, {})).toThrowError('Unexpected token');
});

it('Correctly errors when parsing faulty style tag', async () => {
	const content = getFile(files, '/test/fixtures/errors/style.astro');
	expect(() => format(content, {})).toThrowError('CssSyntaxError');
});
