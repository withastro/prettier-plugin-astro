import prettier from 'prettier';
import { fileURLToPath } from 'url';
import { expect, it } from 'vitest';

// workaround for vitest to watch for the files
const srcFiles = import.meta.glob('/src/*.ts', {
  assert: { type: 'raw' },
});

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

function markdownFormat(
  contents: string,
  options: prettier.Options = {}
): string {
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

/**
 * Utility to get `[input, output]` files
 */
function getFiles(file: any, str: string, md?: string) {
  const ext = md === 'markdown' ? 'md' : 'astro';
  let input: string = file[`/test/fixtures/${str}/input.${ext}`];
  let output: string = file[`/test/fixtures/${str}/output.${ext}`];
  // workaround: normalize end of lines to pass windows ci
  input = input.replace(/(\r\n|\r)/gm, '\n');
  output = output.replace(/(\r\n|\r)/gm, '\n');
  return { input, output };
}

function getOptions(files: any, folderName: string) {
  let opts: object;
  try {
    opts = JSON.parse(files[`/test/fixtures/${folderName}/options.json`]);
  } catch (e) {
    opts = {};
  }
  return opts;
}

type Options = {
  mode?: 'default' | 'unaltered' | 'markdown';
};

/**
 * @param {string} name Test name.
 * @param {any} files Files from import.meta.glob.
 * @param {string} folderName Folder name.
 * @param {Options} [{ mode }={ mode: 'default' }]
 *
 * unaltered: input and output should be the same
 *
 * markdown: for markdown files
 */
export function test(
  name: string,
  files: any,
  folderName: string,
  { mode }: Options = { mode: 'default' }
) {
  it(name, async () => {
    const { input, output } = getFiles(files, folderName, mode);

    expect(input, 'Missing input file').to.not.be.undefined;
    expect(output, 'Missing output file').to.not.be.undefined;

    if (mode === 'unaltered') {
      expect(
        input,
        'Unformated file and formated file are not the same'
      ).to.be.equal(output);
    } else {
      expect(
        input,
        'Unformated file and formated file are the same'
      ).to.not.be.equal(output);
    }

    const formatFile = mode === 'markdown' ? markdownFormat : format;

    const opts = getOptions(files, folderName);

    const formatted = formatFile(input, opts);
    expect(formatted, 'Incorrect formating').toBe(output);

    // test that our formatting is idempotent
    const formattedTwice = formatFile(formatted, opts);
    expect(formatted, 'Formatting is not idempotent').toBe(formattedTwice);
  });
}
