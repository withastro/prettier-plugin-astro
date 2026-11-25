---
"prettier-plugin-astro": patch
---

Fixes `{/* prettier-ignore */}` printing an extra `>` or `/>` after the ignored element when `astroCompressHTML` is `"html"` or `"none"`.
