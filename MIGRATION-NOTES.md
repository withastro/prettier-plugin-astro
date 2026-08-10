# Moving to the Rust compiler

This branch replaces `@astrojs/compiler` with `@astrojs/compiler-rs` and, because the new AST
*is* oxc's ESTree JSX AST, replaces the hand-written printer with a delegation to Prettier's own
`prettier/plugins/estree`. The plugin now intercepts only what it has to.

`src/` goes from 1,349 lines across 8 files to ~1,050 across 10, and the whole class of
sentinel-escaping bugs (`@` → `ΩP_`, three releases' worth) disappears with the Babel round-trip
that needed it.

## Compiler version dependency — must be resolved before merge

`package.json` currently points `@astrojs/compiler-rs` at a **local build**:

```json
"//TODO": "@astrojs/compiler-rs is linked to a local build (compiler-rs#136 + withastro/oxc#7). Replace with a published version before merging.",
"@astrojs/compiler-rs": "link:../../compiler-rs/local-rewrite-integration/packages/compiler"
```

Two unreleased compiler changes are load-bearing:

- **`comments` on the AST root** (compiler-rs #136). Published `0.3.2` puts no comments in the AST
  at all, so under a print-from-AST architecture *every comment in every file is silently deleted*.
- **UTF-16 parse offsets** (same PR). `parse()` used to report UTF-8 byte offsets; Prettier indexes
  UTF-16 strings, so any source slicing drifted right of a multibyte character.
- **Corrected Astro shorthand attribute spans** (withastro/oxc #7). `<C {foo} />` used to report
  the same span for the attribute and its name, which is how shorthand is now detected.

`0.3.2` will not work. The dependency must become a published version before this merges.

## What changed, and why the churn is acceptable

45 fixture outputs changed. Every fixture is still asserted for both correctness and idempotency,
and the suite is green (101 tests). The differences fall into these groups.

**1 — Prettier's JSX break decisions replace the old printer's (most of the churn).**
Expression containers hug (`{colors.map(…)}` instead of `{\n  colors.map(…)\n}`), an element whose
only child is an expression no longer force-breaks (`<h1>{1 + 2}</h1>`), and an arrow body
containing JSX wraps in parens. This is churn *toward* what a Prettier user expects, and it is not
something the delegation can opt out of without reimplementing the JSX printer.

**2 — Tag-marker borrowing is gone.** `<a href="#"\n  >text</a\n>` becomes `<a href="#">\n  text\n</a>`,
and where a rendered space has to survive the break, Prettier's own `{" "}` sentinel appears.
Prettier's JSX printer has no borrowing mechanism. Under the default `astroCompressHTML: 'jsx'` the
compiler deletes newline runs, so the plain form renders identically; where it would not, the
sentinel is emitted instead. See "Whitespace" below.

**3 — Whitespace now models the compiler.** New `astroCompressHTML` option (`'jsx' | 'html' | 'none'`,
default `'jsx'`, with `true`/`false` accepted as aliases for `'html'`/`'none'`). The old printer
modelled `compressHTML: true`, which stopped being Astro's default in 7.0.0. The corpus audit
measured five fixtures that the old plugin rendered differently under `'jsx'`; those are fixed —
`basic/inline-whitespace` now keeps its trailing space via `{" "}`, and all three
`option-html-whitespace-sensitivity-*` fixtures keep the five spaces between their `<span>`s
(collapsed to one, which is render-identical).

**4 — Empty-element normalisation is now consistent.** Previously the template and the inside of a
`{…}` expression disagreed, because expressions were round-tripped through the old compiler's
serializer. Now, everywhere: an element self-closes only if it is a component, an HTML void
element, a `<slot>` with no children, or carries `set:html`/`set:text`; anything else is printed
with both tags, so `<div />` becomes `<div></div>` and `<style … />` becomes `<style …></style>`
(a self-closed non-void tag does not self-close in an HTML parser).

**5 — Two bug fixes show up as fixture changes.**
`other/doctype-with-extra-attributes` no longer drops the public and system identifiers from
`<!doctype html PUBLIC "…" "…">` — that was silent data loss. `other/slots` no longer self-closes
`<slot name="a">   </slot>`, which deleted the fallback content the compiler emits for it; `slot`
is out of the void-element list and is printed self-closing only when it has no children at all.

## Judgment calls, flagged rather than silently made

- **Components and custom elements under `htmlWhitespaceSensitivity: ignore` keep the `c380d32`
  behaviour.** Under `ignore` the formatter may alter any rendered whitespace, which is exactly what
  that commit produced. `WHITESPACE-SPEC.md` §8 recommends treating them as `display: inline` to
  match Prettier and Biome; that is a policy change and is deliberately **not** made here.
  Under `css`, components and custom elements are inline, as before.
- **`astroAllowShorthand: false` does not expand author-written shorthand.** It only refrains from
  collapsing `name={name}` into `{name}`. The orphaned `option-astro-allow-shorthand-false` fixture
  asserted expansion; the active `other/shorthand-in-expression` fixture asserts preservation, and
  they contradict each other. Preservation wins — expanding `{obj?.prop}` produces an attribute name
  that is not valid to write by hand. The orphaned fixture was regenerated.
- **`astroSortOrder` was not reinstated.** The option has not existed in `src/options.ts` for some
  time; the two fixtures recording it were **deleted** rather than kept as permanent known-failures.
- **`other/unclosed-tag` became an error fixture.** The compiler rejects `</uL>` closing a `<ul>`
  outright, so there is no formatted output to regenerate. The input moved to
  `test/fixtures/errors/unclosed-tag.astro` with an assertion on the diagnostic.
- **Container-edge whitespace significance follows Prettier's HTML rule, not `separator.mjs`.**
  For a run at a container's first/last child boundary, `spike/spec/separator.mjs` consults only the
  non-edge neighbour, which makes `<div>\n  hello\n</div>` whitespace-significant. Prettier's HTML
  printer consults the *parent's* display there, which is also what a browser does for a block
  container. Following the spike literally would have printed `<div> hello </div>`. This is a
  deliberate, measured divergence and the spec's §7 already flags its own rule as over-conservative.
- **`astroExpressionParser` is removed.** It only existed to make Astro expressions parseable by
  Babel; expressions now arrive parsed. This is a **breaking change for downstream plugins** that
  wrapped it. `test/fixtures/other/embedded-expr-options` was rewritten to wrap `parsers.astro`
  instead, which is the replacement hook and still works.
- **`ignoreNext` module-level state is gone.** `<!-- prettier-ignore -->` is now resolved during
  parsing by marking the following sibling, so nothing leaks between files in a shared process.

## Deliberately deferred

- **`astroCompressHTML: 'html'` and `'none'` can still insert a rendered space.** Prettier's JSX
  printer always puts two adjacent element children on separate lines and cannot borrow tag markers,
  so `<span>a</span><span>b</span>` becomes two lines. Under `'jsx'` (the default, and Astro's) the
  compiler deletes that newline and nothing changes; under `'html'`/`'none'` it renders as a space.
  Fixing this needs a children printer of our own, which is the thing this rewrite exists to avoid.
  Every other position is sound in all three modes.
- **Multi-space runs collapse to one space.** `a</span>     <span>b` keeps a space, not five.
  Render-identical under normal CSS; a byte-level difference in the compiler's output.
- **`embeddedLanguageFormatting: "off"` loses frontmatter and `<script>` comments.** Those regions
  are reformatted from the source slice through `textToDoc`, so their comments are removed from the
  root `comments` array to avoid double-printing. With `embed` skipped, nothing reprints them.
  Raw element bodies (`<style>`, `<pre>`, `is:raw`) are printed verbatim on that path rather than
  reflowed.
- **Range formatting is still a no-op.** It was a crash before (`Cannot read properties of undefined
  (reading 'start')`); it now returns the source unchanged. Prettier's range logic only descends into
  node types on its own allowlist, which Astro's root is not on.
- **Backtick attributes are detected from the source text** (`` a=`x` ``), because the AST has no
  marker distinguishing them from `a={`x`}`. Same for shorthand attributes, which are detected from
  the attribute span starting at `{`. Both would be better as compiler flags.

## Prettier version sensitivity

`prettier` is a **peer dependency**, not a regular one. This matters more than it used to: the
printer imports `prettier/plugins/estree` directly, so if the plugin resolves a *different*
prettier than the one running the format, core and the estree plugin disagree and `attachComments`
throws `Cannot read properties of undefined (reading 'value')` on **any file containing a JSX or
expression comment**. Two copies is not hypothetical — it is what a regular `dependencies` entry
produces for a user on a newer 3.x.

With a single prettier, 3.5.3 and 3.9.5 both work: no crashes, no `Missing visitor keys`, no
`embed` breakage — the 3.7.0 `embed.getVisitorKeys` change that broke printer-wrapping plugins
(withastro/prettier-plugin-astro#452) falls back to ours.

The dev dependency is pinned to an exact `3.5.3` so fixture output is deterministic. Under 3.9.5,
8 of 94 fixtures differ, and all 8 are upstream printer changes in `textToDoc`-delegated content,
reproducible with no plugin involved: seven `return/*` fixtures hit
`return 1, 2 as const` → `return (1, 2 as const)` in `babel-ts`, and
`styles/format-nested-style-tag-content` hits the CSS printer's selector-case change. Bumping the
pin means regenerating those 8.

`...estree` is spread, never enumerated, and `prettier` plus `prettier/plugins/estree` are external
in `rollup.config.mjs` — bundling the latter is what silently corrupted output in
prettier-plugin-svelte#506.

## Corpus

The manifest-driven corpus from the whitespace spike came across: `test/fixtures/manifest.json`
plus a 68-line `test/tests/conformance.test.ts` replace the six per-group test files. The generator
lives at `scripts/build-manifest.mjs` (`pnpm corpus:manifest`) with `scripts/known-failing.json`
next to it — currently empty, since nothing is failing. 94 cases, all active.

`pnpm build` must precede `pnpm test`; the harness runs against `dist/`.
