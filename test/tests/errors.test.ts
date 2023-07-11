import { expect, it } from 'vitest';
import { format } from '../test-utils';

const files = import.meta.glob('/test/fixtures/errors/**/*', {
	eager: true,
	as: 'raw',
});

function getFile(allFiles: any, path: string): string {
	return allFiles[path];
}

it('Correctly errors when parsing faulty frontmatter', async () => {
	const content = getFile(files, '/test/fixtures/errors/frontmatter.astro');
	await expect(format(content, {})).rejects.toThrow('Unexpected token (3:1)');
});

it('Correctly errors when parsing faulty expressions', async () => {
	const content = getFile(files, '/test/fixtures/errors/expression.astro');
	await expect(format(content, {})).rejects.toThrow('Unexpected token');
});

it('Correctly errors when parsing faulty attributes with expression', async () => {
	const content = getFile(files, '/test/fixtures/errors/attribute.astro');
	await expect(format(content, {})).rejects.toThrow('Unexpected token');
});

it('Correctly errors when parsing faulty style tag', async () => {
	const content = getFile(files, '/test/fixtures/errors/style.astro');
	await expect(format(content, {})).rejects.toThrow('CssSyntaxError');
});
