import prettier from 'prettier';

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

export async function markdownFormat(
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
