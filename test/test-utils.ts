import prettier from 'prettier';
import { expect, it } from 'vitest';

const plugins = [new URL('../dist/index.js', import.meta.url).href];

/**
 * format the contents of an astro file
 */
export async function format(
	contents: string,
	options: Partial<prettier.CursorOptions>,
): Promise<prettier.CursorResult> {
	try {
		return await prettier.formatWithCursor(contents, {
			parser: 'astro',
			plugins,
			cursorOffset: -1,
			...options,
		});
	} catch (e) {
		if (e instanceof Error) {
			throw e;
		}
		if (typeof e === 'string') {
			throw new Error(e);
		}
	}
	return {
		formatted: '',
		cursorOffset: -1,
	};
}

async function markdownFormat(
	contents: string,
	options: Partial<prettier.CursorOptions>,
): Promise<prettier.CursorResult> {
	try {
		return await prettier.formatWithCursor(contents, {
			parser: 'markdown',
			plugins,
			cursorOffset: -1,
			...options,
		});
	} catch (e) {
		if (e instanceof Error) {
			throw e;
		}
		if (typeof e === 'string') {
			throw new Error(e);
		}
	}
	return {
		formatted: '',
		cursorOffset: -1,
	};
}

/**
 * Utility to get `[input, output]` files
 */
function getFiles(file: any, path: string, isMarkdown = false) {
	const ext = isMarkdown ? 'md' : 'astro';
	let input: string = file[`/test/fixtures/${path}/input.${ext}`];
	let output: string = file[`/test/fixtures/${path}/output.${ext}`];
	// workaround: normalize end of lines to pass windows ci
	if (input) input = input.replace(/\r\n|\r/g, '\n');
	if (output) output = output.replace(/\r\n|\r/g, '\n');
	return { input, output };
}

function getOptions(files: any, path: string) {
	if (files[`/test/fixtures/${path}/options.js`] !== undefined) {
		return files[`/test/fixtures/${path}/options.js`].default;
	}

	let opts: object;
	try {
		opts = JSON.parse(files[`/test/fixtures/${path}/options.json`]);
	} catch {
		opts = {};
	}
	return opts;
}

/**
 * @param {string} name Test name.
 * @param {any} files Files from import.meta.glob.
 * @param {string} path Fixture path.
 * @param {boolean} isMarkdown For markdown files
 * @param {number} cursorOffset Specify where the cursor is.
 */
export function test(
	name: string,
	files: any,
	path: string,
	isMarkdown = false,
	cursorOffset = -1,
) {
	it(`${path}\n${name}`, async () => {
		const { input, output } = getFiles(files, path, isMarkdown);

		expect(input, 'Missing input file').to.not.be.undefined;
		expect(output, 'Missing output file').to.not.be.undefined;

		const formatFile = isMarkdown ? markdownFormat : format;

		const opts = {
			...getOptions(files, path),
			cursorOffset,
		};

		const firstPass = await formatFile(input, opts);
		expect(firstPass.formatted, 'Incorrect formatting').toBe(output);

		// test that our formatting is idempotent
		const secondPass = await formatFile(firstPass.formatted, opts);
		expect(firstPass.formatted === secondPass.formatted, 'Formatting is not idempotent').toBe(true);
	});
}
