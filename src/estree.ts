import type { Printer } from 'prettier';
import { printers } from 'prettier/plugins/estree';

export const estree = (printers as Record<string, Printer>).estree as Printer & {
	print: (path: unknown, options: unknown, print: unknown, args?: unknown) => unknown;
	embed: (path: unknown, options: unknown) => unknown;
	getVisitorKeys: (node: unknown, nonTraversableKeys: Set<string>) => string[];
};
