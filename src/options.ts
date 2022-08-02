import { SupportOption } from 'prettier';

declare module 'prettier' {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface RequiredOptions extends PluginOptions {}
}

export interface PluginOptions {
	astroAllowShorthand: boolean;
}

export const options: Record<keyof PluginOptions, SupportOption> = {
	astroAllowShorthand: {
		since: '0.0.10',
		category: 'Astro',
		type: 'boolean',
		default: false,
		description: 'Enable/disable attribute shorthand if attribute name and expression are the same',
	},
};
