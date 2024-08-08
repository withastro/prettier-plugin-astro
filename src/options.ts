import type { SupportOption } from 'prettier';

interface PluginOptions {
	astroAllowShorthand: boolean;
	astroSkipFrontmatter: boolean;
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
};
