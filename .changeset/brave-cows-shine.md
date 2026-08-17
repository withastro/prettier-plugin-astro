---
'prettier-plugin-astro': patch
---

Fixes the closing tag being split from a trailing void element like `<img>` with `astroCompressHTML: 'html'` or `'none'`
