import { SupportOption } from 'prettier';

interface PluginOptions {
	astroAllowShorthand: boolean;
}

declare module 'prettier' {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface RequiredOptions extends PluginOptions {}
}

// https://prettier.io/docs/en/plugins.html#options
export const options: Record<keyof PluginOptions, SupportOption> = {
	astroAllowShorthand: {
		since: '0.0.10',
		category: 'Astro',
		type: 'boolean',
		default: false,
		description: 'Enable/disable attribute shorthand if attribute name and expression are the same',
	},
};
