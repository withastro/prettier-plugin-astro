---
'prettier-plugin-astro': patch
---

Adds support for three `astroAllowShorthand` formatting modes:

- When unset / `undefined`, the attributes stay as written, i.e `<Comp value={value} />` and `<Comp {value} />` can co-exist in the same file.
- When set to `true`, attributes that can be written in the shorthand form will automatically be transformed. `<Comp value={value} />` will become `<Comp {value} />`
- When set to `false`, attributes will always be expanded to their full form.
