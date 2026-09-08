---
'prettier-plugin-astro': major
---

The plugin has been fully rewritten on top of Astro 7's new Rust compiler. This rewrite fixes many lingering issues that have been reported since the inception of the project, such as certain elements not being handled properly inside expressions.
 
Whitespace is now properly handled like Astro itself does, and a new `astroCompressHTML` option has been added to match Astro's `compressHTML` setting. In addition, this rewrite has allowed us to more closely match Prettier's built-in JSX and HTML formatting, leading to less cosmetic differences between the different files in your repo.
