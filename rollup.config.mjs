import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
	input: 'src/index.ts',
	plugins: [commonjs(), typescript()],
	// Bundling `prettier/plugins/estree` is what silently corrupted output in prettier-plugin-svelte#506.
	external: [
		'prettier',
		'prettier/doc',
		'prettier/plugins/estree',
		'@astrojs/compiler-rs',
		'sass-formatter',
		'node:module',
		'node:buffer',
	],
	output: {
		dir: 'dist',
		format: 'esm',
		sourcemap: true,
	},
});
