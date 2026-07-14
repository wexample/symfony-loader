# symfony_loader

Version: 1.0.1

A dynamic rendering system for Symfony

## Table of Contents

- [Suite Integration](#suite-integration)
- [Dependencies](#dependencies)
- [Versioning](#versioning)
- [License](#license)
- [Suite Integration](#suite-integration)
- [Suite Signature](#suite-signature)
- [Installation](#installation)
- [Introduction](#introduction)
- [Migration Notes](#migration-notes)

## Integration in the Suite

This package is part of the Wexample Suite — a collection of high-quality, modular tools designed to work seamlessly together across multiple languages and environments.

### Related Packages

The suite includes packages for configuration management, file handling, prompts, and more. Each package can be used independently or as part of the integrated suite.

Visit the [Wexample Suite documentation](https://docs.wexample.com) for the complete package ecosystem.

## Dependencies

- php: >=8.2
- wexample/php-html: >=0.1.6
- wexample/symfony-dev: >=4.0.0
- wexample/symfony-helpers: >=3.0.0
- wexample/symfony-routing: >=0.1.5
- wexample/symfony-translations: >=2.0.5
- friendsofsymfony/jsrouting-bundle: ^3.2.1
- symfony/webpack-encore-bundle: ^2.0.1
- fortawesome/font-awesome: ^6.7

## Versioning & Compatibility Policy

Wexample packages follow **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

We maintain backward compatibility within major versions and provide clear migration guides for breaking changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Free to use in both personal and commercial projects.

## Integration in the Suite

This package is part of the Wexample Suite — a collection of high-quality, modular tools designed to work seamlessly together across multiple languages and environments.

### Related Packages

The suite includes packages for configuration management, file handling, prompts, and more. Each package can be used independently or as part of the integrated suite.

Visit the [Wexample Suite documentation](https://docs.wexample.com) for the complete package ecosystem.

# About us

[Wexample](https://wexample.com) stands as a cornerstone of the digital ecosystem — a collective of seasoned engineers, researchers, and creators driven by a relentless pursuit of technological excellence. More than a media platform, it has grown into a vibrant community where innovation meets craftsmanship, and where every line of code reflects a commitment to clarity, durability, and shared intelligence.

This packages suite embodies this spirit. Trusted by professionals and enthusiasts alike, it delivers a consistent, high-quality foundation for modern development — open, elegant, and battle-tested. Its reputation is built on years of collaboration, refinement, and rigorous attention to detail, making it a natural choice for those who demand both robustness and beauty in their tools.

Wexample cultivates a culture of mastery. Each package, each contribution carries the mark of a community that values precision, ethics, and innovation — a community proud to shape the future of digital craftsmanship.

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

# wexample/symfony-loader

Version: 0.0.20

A dynamic rendering system for Symfony

## Table of Contents

- [Installation](#installation)


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

## Migration Notes

When upgrading between major versions, refer to the migration guides in the documentation.

Breaking changes are clearly documented with upgrade paths and examples.
