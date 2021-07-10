const { parse: parseAstro } = require('@astrojs/parser');

/**
 * @param {string} text 
 */
const parse = (text) => parseAstro(text)

module.exports = parse;
