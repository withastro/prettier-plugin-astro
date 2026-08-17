import type { AstPath, Doc, ParserOptions } from 'prettier';
import { doc } from 'prettier';
import type { AstroNode } from '../ast';
import { type Separator, forcesBreak, separatorFor } from '../whitespace';

const { fill, group, hardline, indent, line, softline } = doc.builders;
const { willBreak } = doc.utils;

const leadingWhitespace = /^[\t\n\f\r ]+/;
const trailingWhitespace = /[\t\n\f\r ]+$/;
const whitespaceRun = /[\t\n\f\r ]+/;
const newline = /[\n\r]/;

type PrintFn = (selector?: string | number | (string | number)[]) => Doc;
type ChildIterator = (callback: (child: AstPath<AstroNode>) => void, key: string) => void;

interface Item {
	node: AstroNode;
	words: string[] | null;
	doc: Doc;
}

function docFor(separator: Separator): Doc | null {
	switch (separator) {
		case 'none':
			return null;
		case 'soft':
			return softline;
		case 'space':
			return line;
		case 'break':
			return hardline;
		case 'blank':
			return [hardline, hardline];
	}
}

/** Runs alternate with items: `runs[i]` is the whitespace before `items[i]`, `runs[n]` the trailing. */
function collect(children: AstroNode[], docs: Doc[]): { items: Item[]; runs: string[] } {
	const items: Item[] = [];
	const runs: string[] = [];
	let pending = '';

	for (const [index, child] of children.entries()) {
		if (child.type !== 'JSXText') {
			runs.push(pending);
			items.push({ node: child, words: null, doc: docs[index] });
			pending = '';
			continue;
		}
		const raw = String(child.raw ?? '');
		if (raw.trim() === '') {
			pending += raw;
			continue;
		}
		const lead = leadingWhitespace.exec(raw)?.[0] ?? '';
		const trail = trailingWhitespace.exec(raw)?.[0] ?? '';
		runs.push(pending + lead);
		items.push({
			node: child,
			words: raw.slice(lead.length, raw.length - trail.length).split(whitespaceRun),
			doc: '',
		});
		pending = trail;
	}

	runs.push(pending);
	return { items, runs };
}

export function printChildren(
	path: AstPath<AstroNode>,
	options: ParserOptions,
	print: PrintFn,
): Doc {
	const container = path.node;
	const docs: Doc[] = [];
	(path as AstPath<AstroNode> & { each: ChildIterator }).each((child) => {
		docs.push(child.node.type === 'JSXText' ? '' : print());
	}, 'astroChildren');

	const { items, runs } = collect(container.astroChildren as AstroNode[], docs);
	// `resolveBlankContainers` already decided whether whitespace-only content survives.
	if (items.length === 0) return runs[0] === '' ? '' : ' ';

	const isRoot = container.astroRoot === true;
	const settings = {
		mode: options.astroCompressHTML,
		sensitivity: options.htmlWhitespaceSensitivity,
	};
	const separatorAt = (index: number, edge: boolean) =>
		docFor(
			separatorFor(
				runs[index],
				{
					container,
					prev: items[index - 1]?.node ?? null,
					next: items[index]?.node ?? null,
					isRoot,
					loneChild: false,
					edge,
				},
				settings,
			),
		);

	const parts: Doc[] = [''];
	const append = (content: Doc) => parts.push([parts.pop()!, content]);
	const separate = (separator: Doc | null) => {
		if (separator !== null) parts.push(separator, '');
	};

	for (const [position, item] of items.entries()) {
		if (position > 0) separate(separatorAt(position, false));
		if (item.words === null) {
			append(item.doc);
			continue;
		}
		for (const [wordPosition, word] of item.words.entries()) {
			if (wordPosition > 0) separate(line);
			append(word);
		}
	}

	const body = fill(parts);
	if (isRoot) return body;
	// A sole element the author gave its own line keeps it, however narrow it is.
	const soleElementOnItsOwnLine =
		items.length === 1 && items[0].words === null && runs.every((run) => newline.test(run));
	// Our children are their own group, so a multi-line opening tag would otherwise leave them hugging it.
	const shouldBreak =
		soleElementOnItsOwnLine ||
		forcesBreak(container) ||
		(container.openingElement !== undefined && willBreak(print('openingElement')));
	return group(
		[indent([separatorAt(0, true) ?? '', body]), separatorAt(items.length, true) ?? ''],
		{ shouldBreak },
	);
}
