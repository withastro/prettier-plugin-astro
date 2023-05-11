module.exports = {
	plugins: [require.resolve('../../../../'), require.resolve('./custom-plugin.js')],
	customPluginClass: 'my-custom-class',
};
