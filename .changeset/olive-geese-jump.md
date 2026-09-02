---
'prettier-plugin-astro': patch
---

Fixes whitespace being added around a lone `<slot />`, which stopped `:empty` from matching the container, with `astroCompressHTML: 'html'` or `'none'`
