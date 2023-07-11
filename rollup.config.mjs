import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
	input: 'src/index.ts',
	plugins: [commonjs(), typescript()],
	external: [
		'prettier',
		'prettier/doc',
		'@astrojs/compiler',
		'@astrojs/compiler/utils',
		'@astrojs/compiler/sync',
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
