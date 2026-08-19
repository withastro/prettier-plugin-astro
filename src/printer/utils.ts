import type { Doc } from 'prettier';
import { doc } from 'prettier';

const { group, ifBreak, indent, join, line, softline } = doc.builders;

/** dedent string & return tabSize (the last part is what we need) */
export function manualDedent(input: string): {
	tabSize: number;
	char: string;
	result: string;
} {
	let minTabSize = Infinity;
	let result = input;
	// 1. normalize
	result = result.replace(/\r\n/g, '\n');

	// 2. count tabSize
	let char = '';
	for (const row of result.split('\n')) {
		if (!row) continue;
		// if any line begins with a non-whitespace char, minTabSize is 0
		if (row[0] && /^\S/.test(row[0])) {
			minTabSize = 0;
			break;
		}
		const match = /^(\s+)\S+/.exec(row); // \S ensures we don’t count lines of pure whitespace
		if (match) {
			if (match[1] && !char) char = match[1][0];
			if (match[1].length < minTabSize) minTabSize = match[1].length;
		}
	}

	// 3. reformat string
	if (minTabSize > 0 && Number.isFinite(minTabSize)) {
		result = result.replace(new RegExp(`^${new Array(minTabSize + 1).join(char)}`, 'gm'), '');
	}

	return {
		tabSize: minTabSize === Infinity ? 0 : minTabSize,
		char,
		result,
	};
}

const srcsetEntries = (value: string) =>
	value
		.split(',')
		.map((entry) => entry.trim().split(/\s+/))
		.filter(([url]) => url !== '');

export const normalizeSrcset = (value: string): string =>
	srcsetEntries(value)
		.map((parts) => parts.join(' '))
		.join(', ');

/** Mirrors prettier's HTML printer, which columns the descriptors up once the list is spread out. */
export function printSrcset(value: string): Doc {
	const entries = srcsetEntries(value).map(([url, ...rest]) => ({
		url,
		descriptor: rest.join(' '),
	}));
	if (entries.length === 0) return value;

	const widest = Math.max(...entries.map((entry) => entry.url.length));
	const widestDescriptor = Math.max(...entries.map((entry) => entry.descriptor.length));
	const printed = entries.map(({ url, descriptor }) => {
		if (descriptor === '') return url;
		const padding = widest - url.length + 1 + (widestDescriptor - descriptor.length);
		return [url, ifBreak(' '.repeat(padding), ' '), descriptor];
	});
	return group([indent([softline, join([',', line], printed)]), softline]);
}

export function printClassNames(value: string): string {
	const lines = value.trim().split(/[\r\n]+/);
	const formattedLines = lines.map((row) => {
		const spaces = /^\s+/.exec(row);
		return (spaces ? spaces[0] : '') + row.trim().split(/\s+/).join(' ');
	});
	return formattedLines.join('\n');
}
