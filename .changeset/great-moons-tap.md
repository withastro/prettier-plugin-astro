---
'prettier-plugin-astro': patch
---

Fixes components with a dotted name like `<Astro.self>` losing their closing tag or failing to format with `astroCompressHTML: 'html'` or `'none'`
