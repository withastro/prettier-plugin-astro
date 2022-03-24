# Beta [Prettier Plugin](https://www.npmjs.com/package/prettier-plugin-astro) for [Astro](https://github.com/withastro/astro)

Format your Astro files using Prettier.

## Format with vscode

1. Install the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
1. Install the plugin as a dev dependency:

With yarn:

```shell
yarn add --dev prettier-plugin-astro
```

With npm:

```shell
npm i -D prettier-plugin-astro
```

## Format with CLI

1. Install Prettier and the plugin as a dev dependency:

With yarn:

```shell
yarn add --dev prettier prettier-plugin-astro
```

With npm:

```shell
npm i -D prettier prettier-plugin-astro
```

2. `yarn prettier .` to check your formatting / `yarn prettier -w .` to fix your formatting.
3. Add

```json
"format": "yarn prettier -w .",
```

to your `package.json`. [Read more about it.](https://prettier.io/docs/en/cli.html)

## Options

Most [options from Prettier](https://prettier.io/docs/en/options.html) will work with the plugin and can be set in a [configuration file](https://prettier.io/docs/en/configuration.html) or through [CLI flags](https://prettier.io/docs/en/cli.html).

### Astro Sort Order

Sort order for markup and styles.

Format: join the keywords `markup` and `styles` with a `|` in the order you want.

| Default                           | CLI Override                  | API Override               |
| --------------------------------- | ----------------------------- | -------------------------- |
| <code>markup &#124; styles</code> | `--astro-sort-order <string>` | `astroSortOrder: <string>` |

### Astro Allow Shorthand

Option to enable/disable component attribute shorthand if attribute name and expression are same.

| Default | CLI Override                     | API Override                  |
| ------- | -------------------------------- | ----------------------------- |
| `false` | `--astro-allow-shorthand <bool>` | `astroAllowShorthand: <bool>` |

## How to make it work with pnpm

See [comment](https://github.com/withastro/prettier-plugin-astro/issues/97)

## Ignore files

Create a `.prettierignore` to ignore any files. [Read more about it.](https://prettier.io/docs/en/ignore.html)

## [Contributing](CONTRIBUTING.md)
