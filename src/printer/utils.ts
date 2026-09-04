import parseSrcset from '@prettier/parse-srcset';
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

export function printSrcset(value: string): Doc {
	const candidates = parseSrcset(decodeQuoteEntities(value));
	const descriptorUnits = { width: 'w', height: 'h', density: 'x' } as const;
	const descriptorTypes = (Object.keys(descriptorUnits) as (keyof typeof descriptorUnits)[]).filter(
		(type) => candidates.some((candidate) => candidate[type]),
	);
	if (descriptorTypes.length > 1) throw new Error('Mixed descriptor in srcset is not supported');

	const descriptorType = descriptorTypes[0];
	const unit = descriptorType ? descriptorUnits[descriptorType] : '';
	const urls = candidates.map((candidate) => candidate.source.value);
	const widestUrl = Math.max(...urls.map((url) => url.length));
	const descriptors = candidates.map((candidate) =>
		descriptorType && candidate[descriptorType] ? String(candidate[descriptorType].value) : '',
	);
	const descriptorLeftLengths = descriptors.map((descriptor) => {
		const decimal = descriptor.indexOf('.');
		return decimal === -1 ? descriptor.length : decimal;
	});
	const widestDescriptorLeft = Math.max(...descriptorLeftLengths);
	const printed = urls.map((url, index) => {
		const parts: Doc[] = [url.replaceAll('"', '&quot;')];
		const descriptor = descriptors[index];
		if (descriptor) {
			const padding =
				widestUrl - url.length + 1 + widestDescriptorLeft - descriptorLeftLengths[index];
			parts.push(ifBreak(' '.repeat(padding), ' '), descriptor + unit);
		}
		return parts;
	});
	return group([indent([softline, join([',', line], printed)]), softline]);
}

export const decodeQuoteEntities = (text: string): string =>
	text.replaceAll('&apos;', "'").replaceAll('&quot;', '"');

export function printClassNames(value: string): string {
	const lines = value.trim().split(/[\r\n]+/);
	const formattedLines = lines.map((row) => {
		const spaces = /^\s+/.exec(row);
		return (spaces ? spaces[0] : '') + row.trim().split(/\s+/).join(' ');
	});
	return formattedLines.join('\n');
}
