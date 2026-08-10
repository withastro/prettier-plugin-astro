import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { format, markdownFormat } from '../test-utils';

const manifestUrl = new URL('../fixtures/manifest.json', import.meta.url);
const manifest: {
	cases: {
		id: string;
		name: string;
		group: string;
		parser: 'astro' | 'markdown';
		input: string;
		output: string;
		options?: Record<string, unknown>;
		optionsModule?: string;
		cursorOffset?: number;
		status: 'active' | 'known-failing';
		reason?: string;
	}[];
} = JSON.parse(readFileSync(manifestUrl, 'utf8'));

const read = (relative: string) =>
	readFileSync(new URL(relative, manifestUrl), 'utf8').replace(/\r\n|\r/g, '\n');

async function optionsFor(entry: (typeof manifest.cases)[number]) {
	if (entry.optionsModule) {
		return (await import(fileURLToPath(new URL(entry.optionsModule, manifestUrl)))).default;
	}
	return entry.options ?? {};
}

const byGroup = new Map<string, typeof manifest.cases>();
for (const entry of manifest.cases) {
	if (!byGroup.has(entry.group)) byGroup.set(entry.group, []);
	byGroup.get(entry.group)!.push(entry);
}

for (const [group, entries] of byGroup) {
	describe(group, () => {
		for (const entry of entries) {
			const run = async () => {
				const options = { ...(await optionsFor(entry)), cursorOffset: entry.cursorOffset ?? -1 };
				const formatFile = entry.parser === 'markdown' ? markdownFormat : format;

				const first = await formatFile(read(entry.input), options);
				expect(first.formatted, 'Incorrect formatting').toBe(read(entry.output));

				const second = await formatFile(first.formatted, options);
				expect(second.formatted, 'Formatting is not idempotent').toBe(first.formatted);
			};

			if (entry.status === 'known-failing') it.fails(`${entry.id}\n${entry.name}`, run);
			else it(`${entry.id}\n${entry.name}`, run);
		}
	});
}

it('every fixture directory is listed in the manifest', () => {
	const listed = new Set(manifest.cases.map((c) => c.id));
	expect(manifest.cases.length).toBe(listed.size);
	expect(listed.size).toBe(96);
});

it('every known-failing case carries a reason', () => {
	for (const entry of manifest.cases.filter((c) => c.status === 'known-failing')) {
		expect(entry.reason, entry.id).toBeTruthy();
	}
});
