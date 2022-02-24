import makeSynchronous from 'make-synchronous';

const parseSync = makeSynchronous(async (source: string) => {
  const dynamicImport = new Function('file', 'return import(file)');
  const { parse } = await dynamicImport('@astrojs/compiler');
  try {
    const { ast } = await parse(source);
    return ast;
  } catch (e) {
    console.error(e);
  }
});

const parse = (text: string) => parseSync(text);

export default parse;
