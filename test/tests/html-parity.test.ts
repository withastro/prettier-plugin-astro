import prettier from 'prettier';
import { expect, it } from 'vitest';
import { format } from '../test-utils';

async function formatAstro(input: string, options: Partial<prettier.CursorOptions> = {}) {
	return (await format(input, options)).formatted;
}

async function expectHtmlParity(
	input: string,
	options: Partial<prettier.CursorOptions> = {},
): Promise<void> {
	const expected = await prettier.format(input, { parser: 'html', ...options });
	await expect(formatAstro(input, { astroCompressHTML: 'html', ...options })).resolves.toBe(
		expected,
	);
}

it('escapes quotes in formatted srcset attributes', async () => {
	const output = await formatAstro(`<img srcset='a"b.png 1x, c.png 2x' />`, {
		astroCompressHTML: 'html',
	});

	expect(output).toBe('<img srcset="a&quot;b.png 1x, c.png 2x" />\n');
	await expect(formatAstro(output, { astroCompressHTML: 'html' })).resolves.toBe(output);
});

it('preserves opaque component props in every compression mode', async () => {
	const input = '<Widget style="color:red" sizes="alpha   beta" srcset="opaque   value" />';

	for (const astroCompressHTML of ['jsx', 'html', 'none'] as const) {
		expect(await formatAstro(input, { astroCompressHTML })).toContain(
			'style="color:red" sizes="alpha   beta" srcset="opaque   value"',
		);
	}
});

it('preserves literal attributes in JSX mode', async () => {
	const input =
		'<img style="color:red;background:blue" sizes="100vw,50vw" srcset="a.png 1x,b.png 2x" />';

	const output = await formatAstro(input);
	expect(output).toContain('style="color:red;background:blue"');
	expect(output).toContain('sizes="100vw,50vw"');
	expect(output).toContain('srcset="a.png 1x,b.png 2x"');
});

it('matches HTML attribute formatting scope', async () => {
	await expectHtmlParity(
		'<div srcset="a.png 1x,b.png 2x">x</div><img sizes="(max-width: 600px) 480px, 1200px" srcset="a.png 1x,b.png 2x">',
		{ printWidth: 40 },
	);
});

it('preserves non-ASCII whitespace in srcset URLs', async () => {
	const input = '<img srcset="a\u00a0b.png 1x, c.png 2x" />';
	expect(await formatAstro(input, { astroCompressHTML: 'html' })).toContain('a\u00a0b.png');
});

it('matches HTML srcset descriptor alignment', async () => {
	await expectHtmlParity('<img srcset="a.png 1x, very-long-name.png 1.25x, b.png 12x">', {
		printWidth: 20,
	});
	await expectHtmlParity('<img srcset="a&quot;b.png 1x, c.png 2x">', { printWidth: 20 });
});

it('matches HTML fallback for invalid srcset values', async () => {
	await expectHtmlParity('<img srcset="a.png 1q">');
	await expectHtmlParity('<img srcset="a.png 1x, b.png 2w">');
	await expectHtmlParity('<img SRCSET="a.png 1q">');
});

it('preserves whitespace in SVG text content', async () => {
	const input = '<svg><text xml:space="preserve">a<tspan>b</tspan>c</text></svg>';
	expect(await formatAstro(input, { astroCompressHTML: 'html' })).toBe(
		'<svg>\n  <text xml:space="preserve">a<tspan>b</tspan>c</text>\n</svg>\n',
	);
	const inherited = await formatAstro(
		'<svg xml:space="preserve"><text>a <tspan>b</tspan> c</text></svg>',
		{
			astroCompressHTML: 'html',
			printWidth: 25,
		},
	);
	expect(inherited).toContain('<text>a <tspan>b</tspan> c</text>');
});

it('preserves whitespace that prevents :empty from matching comment-only content', async () => {
	const input = '<div> <!--comment--></div>';
	expect(await formatAstro(input, { astroCompressHTML: 'html' })).toBe(`${input}\n`);
});

it('matches HTML ignore sensitivity', async () => {
	await expectHtmlParity('<p><span>a</span>\n<span>b</span></p>', {
		htmlWhitespaceSensitivity: 'ignore',
	});
});

it('matches HTML bracket lending and parent closing-tag width', async () => {
	await expectHtmlParity(
		'<p><span>aaaaaaaaaaaaaaaaaaaaaaaa</span><span>bbbbbbbbbbbbbbbbbbbbbbbb</span></p>',
		{ printWidth: 30 },
	);
	await expectHtmlParity('<Component><span>a</span><span>b</span></Component>', {
		printWidth: 35,
	});
	await expectHtmlParity(
		'<span class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"><img src="x" alt="yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy" /></span>',
		{ printWidth: 30 },
	);
});

it('matches HTML bracketSameLine for self-closing tags', async () => {
	await expectHtmlParity(
		'<img src="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" />',
		{ bracketSameLine: true, printWidth: 40 },
	);
	await expectHtmlParity('<span><img src="x" /></span>', { bracketSameLine: true });
});

it('matches case-insensitive HTML attribute names', async () => {
	await expectHtmlParity('<div STYLE="color:red;background:blue"></div>');
	await expectHtmlParity('<img SRCSET="a.png 1x,b.png 2x">');
});
