import prettier from 'prettier';
import { fileURLToPath } from 'url';

/**
 * format the contents of an astro file
 * @param contents {string}
 */
export function format(contents) {
  // for some reason uvu isn't detecting throwing of strings??
  try {
    return prettier.format(contents, {
      parser: 'astro',
      plugins: [fileURLToPath(new URL('../', import.meta.url))],
    });
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error(e);
  }
}
