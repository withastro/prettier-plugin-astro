import type { AstPath, Doc, ParserOptions } from 'prettier';
import { doc } from 'prettier';
import type { AstroNode } from '../ast';
import { type Separator, forcesBreak, opensRawSubtree, separatorFor } from '../whitespace';

const { fill, group, hardline, indent, line, softline } = doc.builders;

const leadingWhitespace = /^[\t\n\f\r ]+/;
const trailingWhitespace = /[\t\n\f\r ]+$/;
const whitespaceRun = /[\t\n\f\r ]+/;

type PrintFn = (selector?: string | number | (string | number)[], args?: unknown) => Doc;
type ChildIterator = (callback: (child: AstPath<AstroNode>, index: number) => void, key: string) => void;

interface Item {
	node: AstroNode;
	index: number;
	words: string[] | null;
	doc: Doc;
}

/** Passed to a child so it withholds its closing `>` for the next sibling to carry onto its line. */
export const lends = 'lends-closing-bracket';

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
			items.push({ node: child, index, words: null, doc: docs[index] });
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
			index,
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
	mode?: 'fill' | 'fill-lending' | 'loose',
): Doc {
	const container = path.node;
	const children = container.astroChildren as AstroNode[];
	const { items, runs } = collect(
		children,
		children.map(() => ''),
	);
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

	// A gap with no whitespace to spend can still break, by carrying the previous tag's `>` down with it.
	const lenders = new Set<number>();
	for (let position = 1; position < items.length; position++) {
		const previous = items[position - 1].node;
		if (separatorAt(position, false) !== null) continue;
		if (previous.type !== 'JSXElement' || !previous.closingElement) continue;
		if (opensRawSubtree(previous)) continue;
		lenders.add(position);
	}

	const lending = new Set([...lenders].map((position) => items[position - 1].index));
	if (mode === 'fill-lending') lending.add(items.at(-1)!.index);
	const printed = new Map<number, Doc>();
	(path as AstPath<AstroNode> & { each: ChildIterator }).each((child, index) => {
		if (child.node.type === 'JSXText') return;
		printed.set(index, print(undefined, lending.has(index) ? lends : undefined));
	}, 'astroChildren');
	for (const item of items) {
		if (item.words === null) item.doc = printed.get(item.index) ?? '';
	}

	const parts: Doc[] = [''];
	const append = (content: Doc) => parts.push([parts.pop()!, content]);
	const separate = (separator: Doc | null) => {
		if (separator !== null) parts.push(separator, '');
	};

	for (const [position, item] of items.entries()) {
		if (position > 0) {
			if (lenders.has(position)) {
				parts.push(softline, '');
				append('>');
			} else separate(separatorAt(position, false));
		}
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
	if (isRoot || mode === 'fill' || mode === 'fill-lending') return body;

	const content: Doc = [
		indent([separatorAt(0, true) ?? '', body]),
		separatorAt(items.length, true) ?? '',
	];
	// The element groups this itself, so a wrapping opening tag takes its children with it.
	if (mode === 'loose') return content;
	return group(content, { shouldBreak: forcesBreak(container) });
}
