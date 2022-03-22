import prettier from 'prettier';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { expect, it } from 'vitest';

/**
 * format the contents of an astro file
 */
function format(contents: string, options: prettier.Options = {}): string {
  try {
    return prettier.format(contents, {
      parser: 'astro',
      plugins: [fileURLToPath(new URL('../', import.meta.url).toString())],
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

function markdownFormat(contents: string, options: prettier.Options = {}): string {
  try {
    return prettier.format(contents, {
      parser: 'markdown',
      plugins: [fileURLToPath(new URL('../', import.meta.url).toString())],
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

async function readFile(path: string) {
  const res = await fs.readFile(fileURLToPath(new URL(`./fixtures${path}`, import.meta.url).toString()));
  return res.toString().replace(/\r\n/g, '\n');
}

/**
 * Utility to get `[src, out]` files
 */
async function getFiles(name: string) {
  const [src, out] = await Promise.all([readFile(`/${name}/input.astro`), readFile(`/${name}/output.astro`)]);
  return [src, out];
}

async function getOptions(name: string) {
  let options: object;
  try {
    options = JSON.parse(await readFile(`/${name}/options.json`));
  } catch (e) {
    options = {};
  }
  return options;
}

async function getMarkdownFiles(name: string) {
  const [src, out] = await Promise.all([readFile(`/${name}/input.md`), readFile(`/${name}/output.md`)]);
  return [src, out];
}

type Mode = {
  mode: 'default' | 'unaltered' | 'markdown';
};

/**
 * @param {string} name Test name.
 * @param {string} folder Folder of the input/output.
 * @param {Mode} [{ mode }={ mode: 'default' }]
 *
 * unaltered: input and output should be the same
 *
 * markdown: for markdown files
 */
export function test(name: string, folder: string, { mode }: Mode = { mode: 'default' }) {
  it(name, async () => {
    const getFiles_ = mode === 'markdown' ? getMarkdownFiles : getFiles;
    const [src, out] = await getFiles_(folder);

    if (mode === 'unaltered') {
      expect(src, 'Unformated file and formated file are not the same').to.be.equal(out);
    } else {
      expect(src, 'Unformated file and formated file are the same').to.not.be.equal(out);
    }

    const options = await getOptions(folder);

    const formatFile = mode === 'markdown' ? markdownFormat : format;

    const formatted = formatFile(src, options);
    expect(formatted, 'Incorrect formating').toBe(out);

    // test that our formatting is idempotent
    const formattedTwice = formatFile(formatted, options);
    expect(formatted, 'Formatting is not idempotent').toBe(formattedTwice);
  });
}
