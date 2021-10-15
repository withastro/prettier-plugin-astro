import { SupportOption } from 'prettier';

declare module 'prettier' {
  interface RequiredOptions extends PluginOptions {}
}

export interface PluginOptions {
  astroSortOrder: SortOrder;
}

export const options: Record<keyof PluginOptions, SupportOption> = {
  astroSortOrder: {
    since: '0.0.1',
    category: 'Astro',
    type: 'choice',
    default: 'markup | styles',
    description: 'Sort order for markup, scripts, and styles',
    choices: [
      {
        value: 'markup | styles',
        description: 'markup | styles',
      },
      {
        value: 'styles | markup',
        description: 'styles | markup',
      },
    ],
  },
};

export const parseSortOrder = (sortOrder: SortOrder): SortOrderPart[] => sortOrder.split(' | ') as SortOrderPart[];

export type SortOrder = 'markup | styles' | 'styles | markup';

export type SortOrderPart = 'markup' | 'styles';
