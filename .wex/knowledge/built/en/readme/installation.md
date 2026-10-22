## Installation

### JS helpers resolution

The webpack helper (`src/Resources/js/webpack/encore.manifest.js`) expects `@wexample/js-helpers` to be installed in the app.

For local dev containers, use `link:` in `package.json`:

```json
{
  "devDependencies": {
    "@wexample/js-helpers": "link:/var/www/javascript-dev/wexample/js-helpers"
  }
}
```

### Local JS packages (dev only)

To use local JS packages in development, configure them in `config/packages/wexample_symfony_dev.yaml`:

```yaml
wexample_symfony_dev:
    js_dev_packages:
        - '/var/www/javascript-dev/wexample/*'
```

The glob `*` scans all subdirectories containing a `package.json` and automatically:
- Adds webpack aliases via `Encore.addAliases()`
- Adds TypeScript paths in `tsconfig.json`

### Assets shipped by a PHP package

The `assets/` directory of this package, and of every bundle built on it, is also an npm package (`@wexample/symfony-loader`, `@wexample/symfony-design-system`…). Declare those as `link:` in the app's `package.json`, never `file:`:

```json
"@wexample/symfony-loader": "link:vendor/wexample/symfony-loader/assets"
```

Yarn 1 copies a `file:` dependency, and the copy is what TypeScript falls back to when a file mapped by the tsconfig `paths` goes missing — errors then appear in files nobody edited. The full mechanism is written down in the `symfony-design-system` knowledge, page *contributing/assets-as-npm-package*.

### Run

```bash
yarn install
yarn watch
```

The manifest and tsconfig are updated automatically.
