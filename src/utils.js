const rootNodeKeys = new Set(['html', 'css', 'module']);
/**
 * 
 * @param {any} node 
 * @returns {node is import('@astrojs/parser').Ast}
 */
const isAstNode = (node) => typeof node === 'object' && Object.keys(node).filter(key => rootNodeKeys.has(key)).length === rootNodeKeys.size;

const flatten = (arrays) => [].concat.apply([], arrays)


/**
 * 
 * @param {any} node 
 * @param {import('prettier').ParserOptions} options 
 */
function getText(node, options) {
    const leadingComments = node.leadingComments

    return options.originalText.slice(
        options.locStart(
            // if there are comments before the node they are not included 
            // in the `start` of the node itself
            leadingComments && leadingComments[0] || node,
        ),
        options.locEnd(node),
    );
}

module.exports = {
    isAstNode,
    flatten,
    getText
}
