---
'prettier-plugin-astro': patch
---

Fixes quotes in a `style` attribute value being written unescaped, which corrupted the attribute and broke the next format
