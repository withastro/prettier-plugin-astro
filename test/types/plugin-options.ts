import type { Config } from 'prettier';
import type { PluginOptions } from '../../index';

const pluginOptions: PluginOptions = {
	astroAllowShorthand: true,
};

const config: Config & PluginOptions = {
	...pluginOptions,
	astroSkipFrontmatter: true,
	astroCompressHTML: 'html',
};

// @ts-expect-error invalid Astro option value
config.astroCompressHTML = 'invalid';
