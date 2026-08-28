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

### Run

```bash
yarn install
yarn watch
```

The manifest and tsconfig are updated automatically.
