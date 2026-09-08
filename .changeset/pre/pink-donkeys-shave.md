---
'prettier-plugin-astro': major
---

The plugin has been fully rewritten on top of Astro 7's new Rust compiler. This rewrite fixes many long-standing issues, such as certain elements not being handled properly inside expressions.
 
Whitespace formatting now matches Astro’s whitespace handling, and a new `astroCompressHTML` option has been added to match Astro's [`compressHTML`](https://docs.astro.build/en/reference/configuration-reference/#compresshtml) setting. If you set `compressHTML` in your Astro config, also set `astroCompressHTML` in your Prettier config to match. 

In addition, this rewrite has allowed us to more closely match Prettier's built-in JSX and HTML formatting, leading to less cosmetic differences between the different files in your repo.
