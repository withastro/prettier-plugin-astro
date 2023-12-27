# prettier-plugin-astro

## 0.13.0

### Minor Changes

- e97406a: Fix plugin sometimes including significant whitespace inside components, fragments and custom elements

## 0.12.3

### Patch Changes

- e75f9c7: Fix `<br />` tags sometimes causing additional spaces to appear
- b4b0918: Fix not being able to format expressions with more than 2 roots

## 0.12.2

### Patch Changes

- 11b0dc7: Fix attributes using optional chaining not formatting correctly

## 0.12.1

### Patch Changes

- 0188f04: Fix attributes with multiple invalid JSX characters in their key inside expressions causing the plugin to throw an error

## 0.12.0

### Minor Changes

- fa1a6e3: Do not delete line breaks and indentation of lines in class attribute

### Patch Changes

- b806845: Format doctype as lowercase to match Prettier 3.0

## 0.11.1

### Patch Changes

- 62fe714: removes pnpm from engines

## 0.11.0

### Minor Changes

- 94ed904: Migrated the plugin to Prettier 3's new APIs. It's unfortunately not possible for a plugin to support both version 2 and 3 of Prettier. As such, from this version on, only Prettier 3 is supported.

## 0.10.0

### Minor Changes

- af9324e: Use the sync entrypoint of the Astro compiler instead of `synckit`, improving performance and reducing the dependency count of the plugin

## 0.9.1

### Patch Changes

- 97c4b07: fix: prevent parsing empty script tags

## 0.9.0

### Minor Changes

- abecea0: Use the babel-ts parser to parse the frontmatter. This parser was already used for expressions inside the template, so the experience should now be more homogenous all throughout the file.
- d2a2c26: Add support for formatting script tags containing JSON, Markdown and other content

## 0.8.1

### Patch Changes

- 9cb4c4f: Add compatibility for other plugins parsing top-level returns in Astro frontmatter
- 88b0d84: Correctly pass options to embedded parsers
- e5cf99d: Fix style tags using Stylus being truncated under certain circumstances

## 0.8.0

### Minor Changes

- c724082: Add support for LESS style tags, fixed crash on style tags with unknown languages
- 18cd321: Add support for formatting spread attributes

## 0.7.2

### Patch Changes

- a97750b: Fix packaging error causing the plugin to only be installable using pnpm

## 0.7.1

### Patch Changes

- 9fa788f: Upgrade `@astrojs/compiler`
- a3ff2ef: Fix inline tags not hugging the end of their content if the last child was a tag

## 0.7.0

### Minor Changes

- 485fb91: Fixed custom-elements being allowed to self close despite the HTML spec saying otherwise

### Patch Changes

- b99b461: Add support for formatting expressions with multiple root elements
- ca48060: Add support for prettier-ignore comments

## 0.6.0

### Minor Changes

- 699e02c: Allow elements with set:\* directives to self-close

### Patch Changes

- 163ffec: Fix `jsxSingleQuote` not considering if there was any incompatible characters inside the attribute value
- 17af6ef: Fix style tags getting moved inside body tags
  Fix fragments with expressions inside being moved to before the expressions in certain cases

## 0.5.5

### Patch Changes

- fe68b94: Fix missing newline after attributes on inline elements when using singleAttributePerLine
- 96e2b28: Fix expressions not hugging the end of the tag in cases where they should
- 4e6fde8: Fix newlines being added to style tags even if they were empty

## 0.5.4

### Patch Changes

- 4115a8e: Support formatting expressions with elements with attributes not compatible with JSX

## 0.5.3

### Patch Changes

- 1da195e: Update to latest version of the compiler

## 0.5.2

### Patch Changes

- 13810b7: End tag hugs text nodes not ending in whitespace
- 5b2177e: Correctly break self-closing tags

## 0.5.1

### Patch Changes

- d4afe5b: Fix TypeScript not working inside expressions

## 0.5.0

### Minor Changes

- 2bc2f38: Properly format multi-lines expressions, fixes expression with leading comments not being formatted properly

## 0.4.1

### Patch Changes

- babd8c3: Properly trim the class attribute on HTML elements

## 0.4.0

### Minor Changes

- 2d78f06: Fix loading workers not working when parser is used from an external module

### Patch Changes

- 285360e: Fixed error when trying to format custom elements
- 1b6622e: Properly handle errors inside style tags

## 0.3.0

### Minor Changes

- 6ebc4d4: Update error handling to give better error messages when we fail to parse an expression, fixed shorthands props not working inside expressions
- bfe22e3: Improve error handling for frontmatter and script tags

## 0.2.0

### Minor Changes

- f9aa07e: Remove support for the Markdown component

## 0.1.3

### Patch Changes

- 4c8d8dc: Use Prettier option: 'singleAttributePerLine'

## 0.1.2

### Patch Changes

- 410dfb4: Use prettier option 'semi' for jsx semi colons
- 410dfb4: HTML attribute quotes now depend on `jsxSingleQuote` option
- 410dfb4: Self-close slots
- 410dfb4: Remove dedup utility

## 0.1.1

### Patch Changes

- d8b666b: fix for jsx empty expression

## 0.1.0

### Minor Changes

- 054d055: Migrate to new compiler. This took months of work, and some things might be broken for the time being. However, it should be a major improvement in most cases over the previous version. We hope you'll like it!

## 0.0.12

### Patch Changes

- ab70152: Fix a bug in "allow shorthand" option (#87)
- 08c5fc6: Bump ava to v4.0.1
- 4eebc6c: Fix comment error when nested
- e28d1cf: Format html using only the plugin itself

## 0.0.11

### Patch Changes

- 4a7d602: Bump ava
- d07451c: Bump @astrojs/parser from 0.20.2 to 0.20.3
- 2c164f7: Format spread operator
- f7cf7c1: Format markdown component content

## 0.0.10

### Patch Changes

- a7ca7bc: Format nested style tag content
- 2995e7c: Add Astro option: 'allow shorthand'
- 7ec632f: Typescript refactor
- 85f7f93: Add support for prettier options

## 0.0.9

### Patch Changes

- 8820423: Fix test macro 'PrettierMarkdown'
- a30ddcd: Bump @astrojs/parser from 0.15.0 to 0.20.2
- 695fc07: Add formatting for <Markdown> components
- 1bf9f7c: Support arbitrary attributes in style tags
- 395b3bd: Add basic support for indented sass
- 672afef: Add new line at the end of the file
- 20a298e: Add support for .sass formatting
- 915a6e2: Add support for prettier-ignore comments

## 0.0.8

### Patch Changes

- 87c3564: Bump mixme from 0.5.1 to 0.5.4 (#12)
- 87c3564: Bump @changesets/cli from 2.16.0 to 2.17.0 (#15)
- 87c3564: Bump eslint-plugin-ava from 12.0.0 to 13.0.0 (#13)
- 87c3564: Preserve tag case (#19)

## 0.0.7

### Patch Changes

- 80df170: Upgrade prettier to ^2.4.1

## 0.0.6

### Patch Changes

- Updated dependencies [47ac2cc]
  - @astrojs/parser@0.15.0

## 0.0.5

### Patch Changes

- ff7ec2f: Add @types/prettier for type support

## 0.0.4

### Patch Changes

- Updated dependencies [ab2972b]
  - @astrojs/parser@0.13.3

## 0.0.3

### Patch Changes

- Updated dependencies [9cdada0]
  - astro-parser@0.11.0

## 0.0.2

### Patch Changes

- Updated dependencies [b3886c2]
  - astro-parser@0.1.0
