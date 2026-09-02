---
'prettier-plugin-astro': patch
---

Fixes whitespace being removed from around a lone `<slot />`, which let a `:empty` rule start matching the container
