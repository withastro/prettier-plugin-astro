import type { SupportOption } from 'prettier';

export type CompressHTML = 'jsx' | 'html' | 'none';

interface PluginOptions {
	astroAllowShorthand: boolean;
	astroSkipFrontmatter: boolean;
	astroCompressHTML: CompressHTML;
}

declare module 'prettier' {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface RequiredOptions extends PluginOptions {}
}

// https://prettier.io/docs/en/plugins.html#options
export const options: Record<keyof PluginOptions, SupportOption> = {
	astroAllowShorthand: {
		category: 'Astro',
		type: 'boolean',
		default: false,
		description: 'Enable/disable attribute shorthand if attribute name and expression are the same',
	},
	astroSkipFrontmatter: {
		category: 'Astro',
		type: 'boolean',
		default: false,
		description: 'Skips the formatting of the frontmatter.',
	},
	astroCompressHTML: {
		category: 'Astro',
		type: 'choice',
		default: 'jsx',
		description:
			"Mirror of Astro's compressHTML config. Tells the formatter which whitespace the compiler will collapse.",
		choices: [
			{
				value: 'jsx',
				description:
					"Astro's default since 7.0.0. Whitespace runs containing a newline are dropped; same-line spaces are content.",
			},
			{
				value: 'html',
				description: 'Browser HTML whitespace rules. Equivalent to compressHTML: true.',
			},
			{ value: 'none', description: 'No collapsing. Equivalent to compressHTML: false.' },
			// Prettier's SupportOption types omit `redirect`, which its own option normaliser honours.
			{ value: true, redirect: 'html' } as unknown as { value: boolean; description: string },
			{ value: false, redirect: 'none' } as unknown as { value: boolean; description: string },
		],
	},
};
