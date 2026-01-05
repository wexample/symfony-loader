# Testing Guide

## Prerequisites

### Coverage Engine Installation

The package uses **PCOV** for code coverage (lightweight alternative to Xdebug).

**Install PCOV (Alpine Linux):**
```bash
apk add --no-cache php83-dev autoconf g++ make
pecl install pcov
echo 'extension=pcov.so' > /usr/local/etc/php/conf.d/pcov.ini
```

**Verify installation:**
```bash
php -m | grep pcov
```

## Running Tests

All commands below should be executed **inside the container** in the package directory:
```bash
cd /var/www/html/vendor/wexample/symfony-loader/
```

### Basic Test Execution

**Run all tests:**
```bash
vendor/bin/phpunit tests/
```

**Run specific test suite:**
```bash
vendor/bin/phpunit tests/Unit
vendor/bin/phpunit tests/Integration
```

## Code Coverage

### HTML Report (Recommended)

Generate an interactive HTML coverage report:
```bash
vendor/bin/phpunit tests/ --coverage-html var/coverage --display-warnings
```

View the report by opening `var/coverage/index.html` in your browser.

### Text Report

Quick coverage summary in terminal:
```bash
vendor/bin/phpunit tests/ --coverage-text
```

### Clover XML (CI/CD)

Generate coverage report for CI tools:
```bash
vendor/bin/phpunit tests/ --coverage-clover var/coverage/clover.xml
```

## Configuration

Coverage settings are configured in `phpunit.xml`:
- Source directory: `src/`
- Test suites: `tests/Unit` and `tests/Integration`
- Bootstrap: `tests/bootstrap.php`

## Debugging Tests

**View detailed test execution:**
```bash
vendor/bin/phpunit tests/ --debug
```

This shows all PHPUnit notices, warnings, and detailed execution flow.

## Troubleshooting

**No coverage data generated:**
- Verify PCOV is installed: `php -m | grep pcov`
- Check `phpunit.xml` has `<source>` section configured

**Tests fail to run:**
- Ensure dependencies are installed: `composer install`
- Check test bootstrap file exists: `tests/bootstrap.php`

**PHPUnit notices about mock objects:**
- Use `createStub()` instead of `createMock()` when no expectations are needed
- Or add `#[AllowMockObjectsWithoutExpectations]` attribute to test methods
