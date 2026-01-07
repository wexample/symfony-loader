# wexample/symfony-loader

Version: 0.0.6

A dynamic rendering system for Symfony

## Table of Contents

- [Installation](#installation)
- [Api Reference](#api-reference)
- [Code Quality](#code-quality)
- [Versioning](#versioning)
- [Changelog](#changelog)
- [Migration Notes](#migration-notes)
- [Security](#security)
- [Privacy](#privacy)
- [Support](#support)
- [Contribution Guidelines](#contribution-guidelines)
- [Maintainers](#maintainers)
- [License](#license)
- [Suite Integration](#suite-integration)
- [Compatibility Matrix](#compatibility-matrix)
- [Dependencies](#dependencies)
- [Suite Signature](#suite-signature)


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

### Select a tsconfig (optional)

To use a different TypeScript config file (for example a dev-only one), set it in Symfony config:

```yaml
# config/packages/dev/wexample_symfony_loader.yaml
wexample_symfony_loader:
    tsconfig_path: tsconfig.dev.json
```

`loader:generate-encore-manifest` writes the chosen value to `assets/encore.manifest.json`, which is picked up by `src/Resources/js/webpack/encore.manifest.js` to configure `enableTypeScriptLoader()`.

## API Reference

Full API documentation is available in the source code docstrings.

Key modules and classes are documented with type hints for better IDE support.

## Code Quality & Typing

All the suite packages follow strict quality standards:

- **Type hints**: Full type coverage with mypy validation
- **Code formatting**: Enforced with black and isort
- **Linting**: Comprehensive checks with custom scripts and tools
- **Testing**: High test coverage requirements

These standards ensure reliability and maintainability across the suite.

## Versioning & Compatibility Policy

Wexample packages follow **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

We maintain backward compatibility within major versions and provide clear migration guides for breaking changes.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and release notes.

Major changes are documented with migration guides when applicable.

## Migration Notes

When upgrading between major versions, refer to the migration guides in the documentation.

Breaking changes are clearly documented with upgrade paths and examples.

## Security Policy

### Reporting Vulnerabilities

If you discover a security vulnerability, please email contact@wexample.com.

**Do not** open public issues for security vulnerabilities.

We take security seriously and will respond promptly to verified reports.

## Privacy & Telemetry

This package does **not** collect any telemetry or usage data.

Your privacy is respected — no data is transmitted to external services.

## Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Documentation**: Comprehensive guides and API reference
- **Email**: contact@wexample.com for general inquiries

Community support is available through GitHub Discussions.

## Contribution Guidelines

We welcome contributions to the Wexample suite!

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

## Maintainers & Authors

Maintained by the Wexample team and community contributors.

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full list of contributors.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Free to use in both personal and commercial projects.

## Integration in the Suite

This package is part of the Wexample Suite — a collection of high-quality, modular tools designed to work seamlessly together across multiple languages and environments.

### Related Packages

The suite includes packages for configuration management, file handling, prompts, and more. Each package can be used independently or as part of the integrated suite.

Visit the [Wexample Suite documentation](https://docs.wexample.com) for the complete package ecosystem.

## Compatibility Matrix

This package is part of the Wexample suite and is compatible with other suite packages.

Refer to each package's documentation for specific version compatibility requirements.

## Dependencies

- php: >=8.2
- wexample/php-html: 0.0.4
- wexample/symfony-dev: 1.0.66
- wexample/symfony-helpers: 1.0.79
- wexample/symfony-routing: 0.0.7
- wexample/symfony-translations: 1.0.66
- friendsofsymfony/jsrouting-bundle: ^3.2.1
- symfony/webpack-encore-bundle: ^2.0.1
- fortawesome/font-awesome: ^6.7


# About us

[Wexample](https://wexample.com) stands as a cornerstone of the digital ecosystem — a collective of seasoned engineers, researchers, and creators driven by a relentless pursuit of technological excellence. More than a media platform, it has grown into a vibrant community where innovation meets craftsmanship, and where every line of code reflects a commitment to clarity, durability, and shared intelligence.

This packages suite embodies this spirit. Trusted by professionals and enthusiasts alike, it delivers a consistent, high-quality foundation for modern development — open, elegant, and battle-tested. Its reputation is built on years of collaboration, refinement, and rigorous attention to detail, making it a natural choice for those who demand both robustness and beauty in their tools.

Wexample cultivates a culture of mastery. Each package, each contribution carries the mark of a community that values precision, ethics, and innovation — a community proud to shape the future of digital craftsmanship.
