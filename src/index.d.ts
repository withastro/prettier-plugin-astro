declare module 'prettier' {
  interface RequiredOptions extends PluginOptions {}
}

export type SortOrder = 'markup | styles' | 'styles | markup';

export interface PluginOptions {
  astroSortOrder: SortOrder;
}
