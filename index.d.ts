import type { Parser, Printer, SupportLanguage, SupportOption } from 'prettier';

export type CompressHTML = 'jsx' | 'html' | 'none';

export interface PluginOptions {
	astroAllowShorthand?: boolean;
	astroSkipFrontmatter?: boolean;
	astroCompressHTML?: CompressHTML;
}

export const languages: Partial<SupportLanguage>[];
export const parsers: Record<string, Parser>;
export const printers: Record<string, Printer>;
export const options: Record<keyof PluginOptions, SupportOption>;
export const defaultOptions: {
	tabWidth: number;
};
