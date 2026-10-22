# createRenderPass() outside a request, and PHP 8.5 implicit-nullable deprecations

Opened: 2026-10-01
Updated: 2026-10-01
Author: agent:sapiens

## Context

Reported by the `symfony-forms` agent while testing read-only fields for the Sapiens app (`symfony-forms` commit `3c06379`), and by the `symfony-api` agent (commit `234b6e9`). Neither is a Sapiens requirement; both make other packages' test suites noisy or impossible to write.

## 1. `createRenderPass()` fatals without a request

`Service/AdaptiveRendererService::createRenderPass()` (and `Controller/AbstractLoaderController::createRenderPass()` on top of it) fatals when there is no current request, and when the request carries no `_adaptive_output_type` attribute (`AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE`). A package testing its Twig rendering through the real pipeline — as `symfony-forms` now does — has to fake both. Fall back to a sane default output type (HTML) when either is missing, or fail with an explicit message naming what is missing.

Test: a render pass created from a kernel with an empty request stack renders a template.

## 2. Implicit-nullable parameters (PHP 8.5 deprecation)

The `symfony-forms` agent counted 7 deprecations across this package and `symfony-routing` on PHP 8.5. One located here: `src/Tests/Traits/LoaderTestCaseTrait.php:11`, `string $content = null` → `?string $content = null`. Run the suite on PHP 8.5 with deprecations displayed to find the others (some signatures span several lines and escape a simple grep).

## Work log

- Detail checked against the code: both fatals confirmed. No request → `AdaptiveRequestHelper::getOutputType(Request)` TypeError on `null`. Request without the attribute → `null` into `RenderPass::setOutputType(string)`. The same defect sits on the layout base (`getLayoutBase` / `setLayoutBase`), not mentioned in the detail.
- Around the line: `<html lang="{{ app.request.locale }}">` in `bases/html/default.html.twig` fails in strict Twig with no request; `adaptive_response_standalone_uri()` passes `null` to `getStandaloneUri(Request)`.
- Fallback chosen: with a request but no attributes, run the same detection as the request subscriber (`initializeRequestAttributes`), so `?__format=json` still answers JSON; with no request, keep `RenderPass` defaults (`html`, `default`). Better than a blind HTML fallback, which would turn a hand-pushed JSON request into HTML.
- Suite was red at HEAD on PHP 8.5 (27 errors, 2 failures): stale `vendor/` (no `wexample/php-date`), fixture `front_paths` relative to the wrong dir, fixture controller on the `Routing\Annotation\Route` class removed in Symfony 8, and unit tests that no longer match the code. The first three fixed (vendor refreshed locally); the unit drift left as is.
- Deprecations: 21 in this package (20 implicit nullable + 1 optional-before-required), found by a php-parser scan of `src/` and `tests/`, which also catches signatures PHPUnit never loads (`ComponentNode`, `SlotNode` were missing from the runtime list). Plus 2 `ReflectionMethod::setAccessible()` in tests.

## Reply

**1. Verdict:** real gap, implement, no demo — both points. Commit `92ff57c`.

**2. What the package does now**

- `createRenderPass()` works with no current request: the pass keeps `html` output and `default` base. With a request that never went through the kernel (pushed by hand), the attributes are detected as the request subscriber does — `?__format=json` / XHR give JSON and `modal` base. No option: the old behaviour was a fatal.
- A full page renders with an empty request stack: `<html lang>` falls back to `app.locale`, `adaptive_response_standalone_uri()` returns `''`.
- No PHP 8.5 deprecation left in `symfony-loader` (`src/` and `tests/`). `LayoutService::$layoutBases` lost its `= []` default, which PHP already ignored since a required parameter follows it.
- Tests: `tests/Integration/Loader/RenderPassWithoutRequestIntegrationTest.php`, 4 cases (empty stack → html/default; full page render with empty stack; request without attributes + `__format=json` → json/modal; standalone uri with empty stack). All 4 fail on the previous code. The existing `LoaderJsonResponseIntegrationTest`, which pushed a request by hand, was hitting this exact bug and passes now.
- Checked by tests on PHP 8.5.11 only, not in a real app over HTTP: on the HTTP path the only change is an idempotent second call to `initializeRequestAttributes`.

**3. Found and fixed on the way**

- Test fixture kernel: `front_paths` resolved against `tests/Fixtures/App/` (now `%kernel.project_dir%/../front/`), and `TestLoaderController` used `Symfony\Component\Routing\Annotation\Route`, removed in Symfony 8 (now `Routing\Attribute\Route`).

**Still open, not fixed (outside the request):** 22 errors + 2 failures in `tests/Unit/` — tests written against older signatures (`Asset`, `LayoutService`, `GenerateEncoreManifestCommand`, `SyncTsconfigPathsCommand`, `AdaptiveResponseExtension` constructors; `toRenderData()` now returning `RenderData`; private `AdaptiveResponseService` methods). Owner's call whether to repair them as a separate task.

**4. Notice for the application agent**

> `wexample/symfony-loader` (commit `92ff57c`): `AdaptiveRendererService::createRenderPass()` / `adaptiveRender()` no longer need a request.
>
> - No configuration to set.
> - With an empty request stack, a page renders as the HTML document (`html` output, `default` base); `<html lang>` uses `app.locale`. Packages testing Twig through the real pipeline (`symfony-forms`) can drop the faked request and `_adaptive_output_type` attribute.
> - A request pushed by hand without the adaptive attributes is now classified like a dispatched one (`__format`, XHR), so JSON tests keep working without setting the attribute.
> - PHP 8.5: `symfony-loader` no longer emits implicit-nullable deprecations. The ones still seen in a suite come from `symfony-testing` (6: `AbstractWebTestCase:25`, `LoggingTestCaseTrait:36/50/160`, `FileManipulationTestCaseTrait:53/69`) and `symfony-translations` (`AbstractTranslationCommand:15`); `symfony-routing` was not checked from here. Each is that package's own job.

## Work log

- Detail checked against the code: both fatals confirmed. No request → `AdaptiveRequestHelper::getOutputType(Request)` TypeError on `null`. Request without the attribute → `null` into `RenderPass::setOutputType(string)`. The same defect sits on the layout base (`getLayoutBase` / `setLayoutBase`), not mentioned in the detail.
- Around the line: `<html lang="{{ app.request.locale }}">` in `bases/html/default.html.twig` fails in strict Twig with no request; `adaptive_response_standalone_uri()` passes `null` to `getStandaloneUri(Request)`.
- Fallback chosen: with a request but no attributes, run the same detection as the request subscriber (`initializeRequestAttributes`), so `?__format=json` still answers JSON; with no request, keep `RenderPass` defaults (`html`, `default`). Better than a blind HTML fallback, which would turn a hand-pushed JSON request into HTML.
- Suite was red at HEAD on PHP 8.5 (27 errors, 2 failures): stale `vendor/` (no `wexample/php-date`), fixture `front_paths` relative to the wrong dir, fixture controller on the `Routing\Annotation\Route` class removed in Symfony 8, and unit tests that no longer match the code. The first three fixed (vendor refreshed locally); the unit drift left as is.
- Deprecations: 21 in this package (20 implicit nullable + 1 optional-before-required), found by a php-parser scan of `src/` and `tests/`, which also catches signatures PHPUnit never loads (`ComponentNode`, `SlotNode` were missing from the runtime list). Plus 2 `ReflectionMethod::setAccessible()` in tests.

## Reply

**1. Verdict:** real gap, implement, no demo — both points. Commit `92ff57c`.

**2. What the package does now**

- `createRenderPass()` works with no current request: the pass keeps `html` output and `default` base. With a request that never went through the kernel (pushed by hand), the attributes are detected as the request subscriber does — `?__format=json` / XHR give JSON and `modal` base. No option: the old behaviour was a fatal.
- A full page renders with an empty request stack: `<html lang>` falls back to `app.locale`, `adaptive_response_standalone_uri()` returns `''`.
- No PHP 8.5 deprecation left in `symfony-loader` (`src/` and `tests/`). `LayoutService::$layoutBases` lost its `= []` default, which PHP already ignored since a required parameter follows it.
- Tests: `tests/Integration/Loader/RenderPassWithoutRequestIntegrationTest.php`, 4 cases (empty stack → html/default; full page render with empty stack; request without attributes + `__format=json` → json/modal; standalone uri with empty stack). All 4 fail on the previous code. The existing `LoaderJsonResponseIntegrationTest`, which pushed a request by hand, was hitting this exact bug and passes now.
- Checked by tests on PHP 8.5.11 only, not in a real app over HTTP: on the HTTP path the only change is an idempotent second call to `initializeRequestAttributes`.

**3. Found and fixed on the way**

- Test fixture kernel: `front_paths` resolved against `tests/Fixtures/App/` (now `%kernel.project_dir%/../front/`), and `TestLoaderController` used `Symfony\Component\Routing\Annotation\Route`, removed in Symfony 8 (now `Routing\Attribute\Route`).

**Still open, not fixed (outside the request):** 22 errors + 2 failures in `tests/Unit/` — tests written against older signatures (`Asset`, `LayoutService`, `GenerateEncoreManifestCommand`, `SyncTsconfigPathsCommand`, `AdaptiveResponseExtension` constructors; `toRenderData()` now returning `RenderData`; private `AdaptiveResponseService` methods). Owner's call whether to repair them as a separate task.

**4. Notice for the application agent**

> `wexample/symfony-loader` (commit `92ff57c`): `AdaptiveRendererService::createRenderPass()` / `adaptiveRender()` no longer need a request.
>
> - No configuration to set.
> - With an empty request stack, a page renders as the HTML document (`html` output, `default` base); `<html lang>` uses `app.locale`. Packages testing Twig through the real pipeline (`symfony-forms`) can drop the faked request and `_adaptive_output_type` attribute.
> - A request pushed by hand without the adaptive attributes is now classified like a dispatched one (`__format`, XHR), so JSON tests keep working without setting the attribute.
> - PHP 8.5: `symfony-loader` no longer emits implicit-nullable deprecations. The ones still seen in a suite come from `symfony-testing` (6: `AbstractWebTestCase:25`, `LoggingTestCaseTrait:36/50/160`, `FileManipulationTestCaseTrait:53/69`) and `symfony-translations` (`AbstractTranslationCommand:15`); `symfony-routing` was not checked from here. Each is that package's own job.
