import { fileURLToPath } from 'url';

export default {
	plugins: [
		fileURLToPath(new URL('../../../../dist/index.js', import.meta.url)),
		fileURLToPath(new URL('./custom-plugin.js', import.meta.url)),
	],
	customPluginClass: 'my-custom-class',
};
