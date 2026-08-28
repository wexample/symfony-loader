# Adaptive rendering (current state)

The design-system controllers now pivot around a light `RenderPass` object instead of calling `render()` directly.
Each controller can override `configureRenderPass()` to inject layout-specific tweaks, while `adaptiveRender()` builds a
render-pass from the view name and hands it to `renderRenderPass()`.

`AbstractDesignSystemController` centralizes the wiring:
- `createRenderPass()` instantiates `RenderPass` with the view and lets controllers customize it if needed.
- `adaptiveRender()`/`renderRenderPass()` funnel every response through that render-pass before delegating to Twig.
- Helpers such as `getTemplateLocationPrefix()` and `getControllerTemplateDir()` resolve the correct Twig namespace based on
  the controller bundle, keeping bundle-specific templates discoverable automatically.

At this stage adaptive rendering basically guarantees that all controllers follow the same rendering pipeline and template
resolution logic, preparing the ground for future hooks (asset aggregation, layout metadata, etc.).

## Template layers for adaptive output

`RenderPass` exposes the desired output type (HTML for now) and a base name. The Twig function `adaptive_response_rendering_base_path(render_pass)`
computes the actual template path using `AdaptiveResponseService`, so a layout like `assets/layouts/test/layout.html.twig` can simply extend the
default layout, which itself extends the base resolved at runtime (`assets/bases/html/default.html.twig`). This ensures bundle layouts stay thin,
while the HTML base owns the document shell (`<!DOCTYPE html>`, `<html lang="…">`, etc.) and yields block `page_body` from the inherited layouts.

## Render-node driven translations

Each page is treated as a “render node”: the controller/view pair points to a translation namespace (e.g. `@page`) whose resources live next to the
page configuration (`assets/config/test/index.en.yml`, `index.fr.yml`, …). The `<title>` helper pulls the global app name from the shared catalogue
but expects the render node to supply its own `@page::page_title` entry, so once the controller wires that namespace the per-page title translates
automatically just like any other render-node specific string.
