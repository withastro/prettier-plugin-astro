/** @type {Record<string, import('prettier').SupportOption> } */
const options = {
    astroSortOrder: {
        since: '0.0.1',
        category: 'Astro',
        type: 'choice',
        default: 'markup | styles',
        description: 'Sort order for markup, scripts, and styles',
        choices: [
            {
                value: 'markup | styles',
                description: 'markup | styles'
            },
            {
                value: 'styles | markup',
                description: 'styles | markup'
            }
        ]
    },
}

const parseSortOrder = (sortOrder) => sortOrder.split(' | ');

module.exports = { options, parseSortOrder }
