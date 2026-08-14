---
'prettier-plugin-astro': major
---

Rewritten on top of Astro's Rust compiler.

Formatting changes throughout. Whitespace now follows your `compressHTML` setting through the new `astroCompressHTML` option, which defaults to `jsx` to match Astro 7. Self-closing tags are kept as written, and comments, doctype identifiers and `<slot>` fallback content are no longer dropped.

`prettier` is now a peer dependency and must be installed alongside the plugin. The internal `astroExpressionParser` has been removed.
