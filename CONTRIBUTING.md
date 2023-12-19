# Contributing

## To get set up

1. `git clone git@github.com:withastro/prettier-plugin-astro.git`
1. `pnpm install`
1. `pnpm build`
1. Run [tests](https://vitest.dev/guide/) with `pnpm test` or `pnpm test:watch` for watch mode
1. Lint code with `pnpm lint`
1. Format code with `pnpm format`
1. Run `pnpm changeset` to add your changes to the changelog on version bump.
   Most changes to the plugin should be `patch` changes while we're before `1.0.0`.

## Notes

1. A single test file can be run with `pnpm test *file-name*`
1. To skip one or more tests in a file, add comments to them individually
1. Watch mode won't rerun tests when changing an input/output file

## Resources for contributing

- [Prettier rationale](https://prettier.io/docs/en/rationale.html)
- [Prettier plugin docs](https://prettier.io/docs/en/plugins.html)
- [Svelte Prettier plugin](https://github.com/sveltejs/prettier-plugin-svelte)
- [Prettier HTML formatter](https://github.com/prettier/prettier/tree/main/src/language-html)
