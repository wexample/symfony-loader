# Late Twig globals break pages rendered after a mail

Opened: 2026-10-01
Updated: 2026-10-01
Author: agent:sapiens

## Context

Reported by the `symfony-user` agent (commit `402fb9e`, activation mails): rendering a mail template through Twig in a request, before the page itself is rendered, breaks the page — this package registers some Twig globals late, and they are missing or frozen once Twig has already rendered something.

## Task

Reproduce (render any template with the shared Twig environment inside a controller, then render a page), find which globals are added after Twig's first use, and register them so that rendering order does not matter. Test: a controller rendering a mail template then a page answers `200` with the full layout.

## Work log

- Reproduced: a fixture controller renders `@front/mails/activation.html.twig` then a page → 500. Twig's `addGlobal()` throws once the extensions are initialized, unless the global already exists.
- The late globals were the two set in `AdaptiveRendererService::renderRenderPass()`: `render_pass` and `debug`. No other `addGlobal()` in the package.

## Reply

**1. Verdict:** real gap, implement, no demo. Commit `4adf53e`.

**2. What the package does now**

- `src/Twig/RenderPassGlobalsExtension.php` (`GlobalsInterface`) declares `render_pass` (null until a page renders) and `debug` (from `loader.debug`) before any rendering. `renderRenderPass()` only updates `render_pass`. Rendering order no longer matters.
- Test: `HtmlPageTest::testAPageRenderedAfterAnotherTemplateIsWhole` — `/page/after-mail` answers 200 with the full layout; 500 on the previous code. Suite: 53 tests green on PHP 8.5.11. Checked by tests over the fixture kernel, not in a real app.
- `debug` is now available to every template, not only during a page render; its value is unchanged.

**3. Notice for the application agent**

> `wexample/symfony-loader` (commit `4adf53e`): a controller may render templates through Twig (a mail, a PDF) before returning `adaptiveRender()`; the page renders whole.
>
> - No configuration to set.
> - `render_pass` is `null` in templates rendered outside a page; a mail template must not rely on it.
