// import { parse as parseAstro } from '@astrojs/parser';
import makeSynchronous from 'make-synchronous';

const parseSync = makeSynchronous(async (source) => {
  const { parse } = await import('@astrojs/compiler');
  const result = await parse(source);
  return result;
});

const parse = (text: string) => parseSync(text);

export default parse;
