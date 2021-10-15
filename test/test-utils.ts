import prettier from 'prettier';
import { fileURLToPath } from 'url';

// TODO: REMOVE IGNORE COMMENTS

/**
 * format the contents of an astro file
 */
export function format(contents: string, options: prettier.Options = {}): string {
  // for some reason uvu isn't detecting throwing of strings??
  try {
    return prettier.format(contents, {
      parser: 'astro',
      // TODO: FIX THIS TS ERROR
      // @ts-ignore
      plugins: [fileURLToPath(new URL('../', import.meta.url))],
      ...options,
    });
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    if (typeof e === 'string') {
      throw new Error(e);
    }
  }
  return '';
}

export function markdownFormat(contents: string): string {
  try {
    return prettier.format(contents, {
      parser: 'markdown',
      // TODO: FIX THIS TS ERROR
      // @ts-ignore
      plugins: [fileURLToPath(new URL('../', import.meta.url))],
    });
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    if (typeof e === 'string') {
      throw new Error(e);
    }
  }
  return '';
}
