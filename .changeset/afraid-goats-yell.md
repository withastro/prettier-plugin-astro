---
'prettier-plugin-astro': patch
---

Fixes a stray `>` being added after an empty or ignored element that is followed by a sibling, with `astroCompressHTML: 'html'` or `'none'`
