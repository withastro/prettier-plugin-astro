import makeSynchronous from 'make-synchronous';
import { Node } from './nodes';

const serializeSync = makeSynchronous(async (node: Node) => {
  const dynamicImport = new Function('file', 'return import(file)');
  const { serialize } = await dynamicImport('@astrojs/compiler/utils');
  try {
    return await serialize(node);
  } catch (e) {
    console.error(e);
  }
});

export const serialize = (node: Node): string => serializeSync(node);
