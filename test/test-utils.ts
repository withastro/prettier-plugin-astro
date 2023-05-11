import prettier from 'prettier';
import { fileURLToPath } from 'url';
import { expect, it } from 'vitest';

/**
 * format the contents of an astro file
 */
export function format(contents: string, options: prettier.Options = {}): string {
	try {
		return prettier.format(contents, {
			parser: 'astro',
			plugins: [fileURLToPath(new URL('../', import.meta.url).toString())],
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
	return '';
}

function markdownFormat(contents: string, options: prettier.Options = {}): string {
	try {
		return prettier.format(contents, {
			parser: 'markdown',
			plugins: [fileURLToPath(new URL('../', import.meta.url).toString())],
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
	return '';
}

/**
 * Utility to get `[input, output]` files
 */
function getFiles(file: any, path: string, isMarkdown = false) {
	const ext = isMarkdown ? 'md' : 'astro';
	let input: string = file[`/test/fixtures/${path}/input.${ext}`];
	let output: string = file[`/test/fixtures/${path}/output.${ext}`];
	// workaround: normalize end of lines to pass windows ci
	if (input) input = input.replace(/(\r\n|\r)/gm, '\n');
	if (output) output = output.replace(/(\r\n|\r)/gm, '\n');
	return { input, output };
}

function getOptions(files: any, path: string) {
	if (files[`/test/fixtures/${path}/options.js`] !== undefined) {
		return files[`/test/fixtures/${path}/options.js`].default;
	}

	let opts: object;
	try {
		opts = JSON.parse(files[`/test/fixtures/${path}/options.json`]);
	} catch (e) {
		opts = {};
	}
	return opts;
}

/**
 * @param {string} name Test name.
 * @param {any} files Files from import.meta.glob.
 * @param {string} path Fixture path.
 * @param {boolean} isMarkdown For markdown files
 */
export function test(name: string, files: any, path: string, isMarkdown = false) {
	it(`${path}\n${name}`, async () => {
		const { input, output } = getFiles(files, path, isMarkdown);

		expect(input, 'Missing input file').to.not.be.undefined;
		expect(output, 'Missing output file').to.not.be.undefined;

		const formatFile = isMarkdown ? markdownFormat : format;

		const opts = getOptions(files, path);

		const formatted = formatFile(input, opts);
		expect(formatted, 'Incorrect formatting').toBe(output);

		// test that our formatting is idempotent
		const formattedTwice = formatFile(formatted, opts);
		expect(formatted === formattedTwice, 'Formatting is not idempotent').toBe(true);
	});
}
