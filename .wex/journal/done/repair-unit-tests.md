# Repair tests/Unit: 22 errors and 2 failures

Opened: 2026-10-01
Updated: 2026-10-01
Author: agent:sapiens

## Context

Found by this package's agent while fixing `createRenderPass()` without a request (commit `92ff57c`, asked by the Sapiens app). Not caused by that change: `tests/Unit/` already had 22 errors and 2 failures, the tests being written against older constructors and return types.

## Task

Bring every unit test back in line with the current signatures, or delete the ones testing code that no longer exists. Then `vendor/bin/phpunit` passes whole, Unit and Integration.

## Work log

- The owner asked to reinvent the suite rather than repair it. Most of the 24 broken unit tests checked wiring through mocks (`expects(once())->method('layoutInit')`): they tested how services call each other, broke on every constructor change, and proved nothing about the output.
- Rewritten around what the bundle promises, through the fixture kernel, `WebTestCase` for HTTP. Mutation-checked: session UI state not read, asset injection skipped, `__format` ignored — each turns tests red.
- The fixture `public/` was git-ignored and copied by hand from `tests/Fixtures/assets/`, so a fresh clone had no manifest. Now tracked (forced: the root `.gitignore` ignores every `build/`), with the test page's hashed stylesheets.

## Reply

**1. Verdict:** done, by rewriting rather than repairing. Commit `587fe13`. `vendor/bin/phpunit` passes whole on PHP 8.5.11: 52 tests, 167 assertions, 0 errors. The 7 deprecations left come from `symfony-testing` and `symfony-translations`.

**2. What the suite does now**

- `tests/Integration/`: `RequestClassificationTest` (8 XHR / `__format` / `__layout` cases), `HtmlPageTest` (document, render data, stylesheets linked or left as placeholders, UI state from the session, an undeclared saved value ignored, 500 on a broken page), `JsonResponseTest` (envelope, page mounted into an existing document, 500 JSON on error), `RenderWithoutRequestTest`, `EncoreCommandsTest` (manifest, tsconfig sync and merge, missing manifest), `LoaderTestCaseTraitTest`.
- `tests/Unit/` keeps the pure logic only: `RenderPass`, `Asset`, `AssetTag`, `AssetsRegistry`, `EncoreManifestBuilder`, `TsconfigPathsSynchronizer`, `FontsAssetUsageService`. Deleted: 15 mock-wiring tests (Twig extensions, `LayoutService`, `PageService`, `JsService`, `AssetsService`, `AdaptiveResponseService`, both commands, layout render nodes).
- Dev dependencies added: `symfony/browser-kit`, `symfony/css-selector`. `SHELL_VERBOSITY=-1` in `phpunit.xml` keeps the kernel logger out of the output.
- Knowledge: `testing.md.j2` rewritten (what the suite checks, how to run it on PHP 8.5 in a container).

**3. Found, not fixed — owner's decision**

- The `modal`, `panel` and `overlay` JSON shells call `icon()`, a function of `symfony-design-system`, which this package does not require. An XHR defaults to `modal`, so without the design system every XHR page fails. JSON tests use `__layout=default` for that reason.
- When the error page itself fails, `adaptiveRender()` answers **200** with the exception message as a JSON string (last `return new JsonResponse($exception->getMessage())`).
- A JSON error answer carries `"ok": true`, and its `body` holds the raw exception message, in every environment.
