---
'prettier-plugin-astro': patch
---

Fixes various formatting issues when using `astroCompressHTML: 'html'` or `'none'`:

- Fixes a stray `>` being added after an empty or ignored element that is followed by a sibling.
- Fixes closing tags being split from trailing void elements like `<img>`.
- Fixes whitespace being added inside tables, lists, and captions under `htmlWhitespaceSensitivity: 'strict'`.
- Fixes line breaks around inline elements being replaced by spaces.
- Allows inline elements to wrap at the print width without adding rendered whitespace.
- Keeps inline elements written on one line on that line.
- Fixes components with dotted names like `<Astro.self>` losing their closing tags or failing to format.
- Fixes whitespace around `inline-block` elements and reflowing markup written on one line.
- Fixes quotes in `style` attribute values being written unescaped, corrupting the attribute and breaking the next format.
- Fixes children hugging the closing bracket when an element's attributes span multiple lines.
- Fixes whitespace being added around a lone `<slot />`, which stopped `:empty` from matching the container.
- Fixes `srcset` values being mangled when a URL contains a comma, such as a `data:` URI or query string.
- Lays out block-level elements like HTML.
- Fixes whitespace being removed around a lone `<slot />`, which allowed `:empty` to start matching the container.
- Fixes children hugging the closing bracket when an element's attributes wrap and allows a lone long attribute to wrap.
- Formats `style` and `srcset` attributes.
- Allows runs of adjacent inline elements to wrap at the print width without adding rendered whitespace.
- Lays out graphical SVG contents one element per line.
- Fixes nested markup being kept on one line.
- Fixes spaces being removed from text directly inside `<body>`.
- Fixes nested elements being collapsed onto a single line.
- Fixes a blank line being left inside an opening tag whose attributes break.
