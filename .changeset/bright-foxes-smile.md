---
'prettier-plugin-astro': patch
---

Adds support for three `astroAllowShorthand` formatting modes:

```text
unset: <Comp value={value} /> -> <Comp value={value} />
       <Comp {value} />        -> <Comp {value} />
true:  <Comp value={value} /> -> <Comp {value} />
false: <Comp {value} />        -> <Comp value={value} />
```
