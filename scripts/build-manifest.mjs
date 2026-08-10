import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const FIXTURES = join(REPO, 'test/fixtures');
const GROUPS = ['basic', 'markdown', 'options', 'other', 'return', 'styles'];

const knownFailing = JSON.parse(
	readFileSync(new URL('./known-failing.json', import.meta.url), 'utf8'),
);

const manifestPath = join(FIXTURES, 'manifest.json');
const existing = existsSync(manifestPath)
	? new Map(JSON.parse(readFileSync(manifestPath, 'utf8')).cases.map((entry) => [entry.id, entry]))
	: new Map();

const cases = [];
for (const group of GROUPS) {
	const dir = join(FIXTURES, group);
	if (!existsSync(dir)) continue;
	for (const item of readdirSync(dir, { withFileTypes: true })) {
		if (!item.isDirectory()) continue;
		const id = `${group}/${item.name}`;
		const path = join(dir, item.name);
		const markdown = existsSync(join(path, 'input.md'));
		const extension = markdown ? 'md' : 'astro';
		const previous = existing.get(id);
		const known = knownFailing[id];

		const entry = {
			id,
			name: previous?.name ?? known?.name ?? titleise(id),
			group,
			parser: markdown ? 'markdown' : 'astro',
			input: `${id}/input.${extension}`,
			output: `${id}/output.${extension}`,
		};
		if (existsSync(join(path, 'options.js'))) entry.optionsModule = `${id}/options.js`;
		else if (existsSync(join(path, 'options.json'))) {
			entry.options = JSON.parse(readFileSync(join(path, 'options.json'), 'utf8'));
		}
		if (previous?.cursorOffset !== undefined) entry.cursorOffset = previous.cursorOffset;
		entry.status = known ? 'known-failing' : 'active';
		if (known) entry.reason = known.reason;
		cases.push(entry);
	}
}
cases.sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(
	manifestPath,
	`${JSON.stringify(
		{
			$comment:
				'Language-agnostic conformance manifest. Paths are relative to this file. Regenerate with `pnpm corpus:manifest`.',
			version: 1,
			cases,
		},
		null,
		2,
	)}\n`,
);

const active = cases.filter((entry) => entry.status === 'active').length;
console.log(
	`${cases.length} cases (${active} active, ${cases.length - active} known-failing) -> ${manifestPath}`,
);
const fresh = cases.filter((entry) => !existing.has(entry.id)).map((entry) => entry.id);
if (fresh.length) console.log(`new fixtures, auto-named: ${fresh.join(', ')}`);

function titleise(id) {
	return id
		.split('/')[1]
		.replaceAll('-', ' ')
		.replace(/^./, (character) => character.toUpperCase());
}
