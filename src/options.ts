import { SupportOption } from 'prettier';

declare module 'prettier' {
  interface RequiredOptions extends PluginOptions {}
}

export interface PluginOptions {
  astroSortOrder: SortOrder;
  astroAllowShorthand: boolean;
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
  astroAllowShorthand: {
    since: '0.0.10',
    category: 'Astro',
    type: 'boolean',
    default: true,
    description: 'Enable/disable attribute shorthand if attribute name and expression are the same',
  },
};

export const parseSortOrder = (sortOrder: SortOrder): SortOrderPart[] => sortOrder.split(' | ') as SortOrderPart[];

export type SortOrder = 'markup | styles' | 'styles | markup';

export type SortOrderPart = 'markup' | 'styles';
