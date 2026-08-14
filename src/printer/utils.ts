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
	for (const line of result.split('\n')) {
		if (!line) continue;
		// if any line begins with a non-whitespace char, minTabSize is 0
		if (line[0] && /^\S/.test(line[0])) {
			minTabSize = 0;
			break;
		}
		const match = /^(\s+)\S+/.exec(line); // \S ensures we don’t count lines of pure whitespace
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

export function printClassNames(value: string): string {
	const lines = value.trim().split(/[\r\n]+/);
	const formattedLines = lines.map((line) => {
		const spaces = /^\s+/.exec(line);
		return (spaces ? spaces[0] : '') + line.trim().split(/\s+/).join(' ');
	});
	return formattedLines.join('\n');
}
