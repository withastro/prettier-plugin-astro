import { parse as parseAstro } from '@astrojs/parser';

const parse = (text: string) => parseAstro(text);

export default parse;
