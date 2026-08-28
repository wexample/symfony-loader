## Architecture

The bundle is a dynamic rendering system layered on top of Symfony and Twig. Every HTTP response—whether a full HTML page or an AJAX JSON payload—travels through the same pipeline: request classification, render-pass construction, Twig rendering with a shared context object, asset detection, and final serialisation. The sections below describe each layer in the order a call passes through them.

### Bundle and dependency injection

src/WexampleSymfonyLoaderBundle.php implements `LoaderBundleInterface` and registers `LoaderTemplatesCompilerPass` on `build()`. Any bundle that implements `LoaderBundleInterface` and returns paths from `getLoaderFrontPaths()` is picked up automatically.

src/DependencyInjection/WexampleSymfonyLoaderExtension.php runs at container compilation time. It walks `kernel.bundles`, collects the front-asset paths each `LoaderBundleInterface` bundle declares, and stores them as the `loader_packages_front_paths` container parameter. It also merges usage configuration (color schemes, responsive breakpoints, margins, animations, fonts) into per-name `loader.usages.*` parameters, and records all front-asset directories as `translations_paths` so the translations subsystem can find them.

src/DependencyInjection/Compiler/LoaderTemplatesCompilerPass.php turns those collected paths into Twig namespace registrations by calling `addPath()` on `twig.loader.native_filesystem`, once per alias per bundle. This is what makes `@WexampleSymfonyLoaderBundle/…` and bundle-specific aliases resolvable in templates.

### Request classification

src/EventSubscriber/AdaptiveResponseRequestSubscriber.php listens on `KernelEvents::REQUEST` at priority 100. It calls src/Service/AdaptiveResponseService.php`::initializeRequestAttributes()`, which stamps two attributes onto the request object:

- `_adaptive_output_type` — `html` for a normal browser request, `json` for an `XMLHttpRequest`. A `__format` query parameter can override the detection.
- `_adaptive_layout_base` — `default` for HTML, or the value of `__layout` (constrained to `default`, `modal`, `panel`, `overlay`, `page`) for JSON.

src/Helper/AdaptiveRequestHelper.php exposes static readers for both attributes and is the single place that knows their string names.

### RenderPass

src/Rendering/RenderPass.php is a per-request value object. Controllers and Twig extensions share it as the single source of truth for what is being rendered. It holds:

- `outputType` (`html` or `json`) and `layoutBase` (`default`, `modal`, …) copied from the request.
- `usagesConfig` — the full list of allowed values for each usage dimension (color scheme, responsive tier, margins, animations, fonts), loaded from container parameters.
- `usages` — the *active* value for each dimension, initialised from config defaults then optionally overridden by session-saved UI state.
- A `registry` map, keyed by context type (`layout`, `page`, `component`, `vue`) and view name, that accumulates every render node created during the pass.
- A `contextRenderNodeStack` that tracks which render node is currently being rendered.
- An src/Rendering/AssetsRegistry.php instance, created fresh for each pass from the project's `public/build/manifest.json`.

### Render nodes

src/Rendering/RenderNode/AbstractRenderNode.php is the base for every rendering context. It extends src/Rendering/RenderDataGenerator.php, which provides `serializeVariables()` and `toRenderData()` used to serialise a node to JSON. Each concrete render node holds its own `assets` array (CSS and JS), a `components` list, `translations`, `vars`, a CSS class name, and an inheritance stack of view names accumulated during Twig template inheritance.

`init()` on `AbstractRenderNode` registers the node in the `RenderPass` registry and context stack, assigns a unique ID and CSS class, and inherits translation domains from the parent context node.

Four concrete types exist:

- src/Rendering/RenderNode/AbstractLayoutRenderNode.php — the outermost context. Holds a `PageRenderNode`. Two subclasses: src/Rendering/RenderNode/InitialLayoutRenderNode.php (for HTML responses; marks its page as `isInitialPage = true`) and src/Rendering/RenderNode/AjaxLayoutRenderNode.php (for JSON responses; carries the rendered HTML body and any Vue templates; has `hasAssets = false` because assets are not re-emitted on AJAX).
- src/Rendering/RenderNode/PageRenderNode.php — the page context nested inside the layout. Its `toRenderData()` adds `isInitialPage`.
- src/Rendering/RenderNode/ComponentRenderNode.php — a reusable UI component. Tracks an `initMode` (`class`, `layout`, `parent`, `previous`, `template`) that tells the front-end how to attach the component to the DOM. `render()` asks Twig to render the component's template and stores the result in `body`.

### Rendering pipeline

src/Controller/AbstractLoaderController.php is the base controller. `adaptiveRender()` delegates to src/Service/AdaptiveRendererService.php.

`AdaptiveRendererService::createRenderPass()`:

1. Instantiates `RenderPass` with the view and a fresh `AssetsRegistry`.
2. Loads each usage's config from the container and seeds the active value from the config default.
3. Reads any saved UI state from the session and applies it.
4. Sets output type and layout base from the request attributes.
5. Optionally calls a `$configurator` closure so controllers can customise the pass.

`AdaptiveRendererService::adaptiveRender()` then branches on output type:

**HTML path**: creates an `InitialLayoutRenderNode`, calls `LayoutService::layoutInitialInit()` (see below), then `renderRenderPass()`. `renderRenderPass()` adds `render_pass` as a Twig global, calls `$twig->render($view, $parameters)`, and passes the response to `injectLayoutAssets()`. That method finds the placeholder `<--  -->` left in the HTML by the layout macro, renders `@WexampleSymfonyLoaderBundle/macros/assets.html.twig` with the current render pass, and replaces the placeholder string with the resulting `<link>` and `<script>` tags.

**JSON path**: creates an `AjaxLayoutRenderNode`, calls `LayoutService::initRenderNode()` to register it, renders the view to capture the page HTML, stores that HTML in the layout node's `body`, calls `toRenderData().toArray()` on the layout node, and returns a `JsonResponse` with the serialised tree. Any exception during rendering re-enters `adaptiveRender()` with a dedicated error view.

### Layout and page initialisation

src/Service/LayoutService.php extends `AbstractRenderNodeService`. `layoutInitialInit()` is called from the layout Twig template via the `layout_initial_init()` function exposed by src/Twig/LayoutExtension.php. It:

1. Calls `layoutInit()`: initialises the layout render node (assets detection runs here via `AbstractRenderNodeService::initRenderNode()`), registers translation domains, and propagates entity translation aliases.
2. Creates the `PageRenderNode` via `createLayoutPageInstance()` and hands it to src/Service/PageService.php`::pageInit()`.
3. Optionally registers a layout-specific page-manager component (modal, panel, or overlay) if `loader.layout_bases` config provides one.

`LayoutExtension` also exposes `layout_render_initial_data()`, which serialises the complete layout render node (including page, components, assets, translations) into the array that the front-end receives embedded in the HTML response.

### Asset pipeline

src/Service/AssetsRegistryService.php is a container-scoped singleton that reads `public/build/manifest.json` once at boot and maintains a flat registry of all `Asset` objects added during the request.

src/Rendering/Asset.php holds two paths: `path` (the stable manifest key, e.g. `build/@Bundle/css/view.css`) and `publicPath` (the hashed URL from the manifest value). The browser loader uses `publicPath` directly when injecting assets dynamically, avoiding 404s on content-hashed filenames in production.

Six usage services, all subclassing src/Service/Usage/AbstractAssetUsageService.php, define how asset file names are derived from a view path:

- src/Service/Usage/DefaultAssetUsageService.php — looks for `build/@Bundle/css/<view>.css` and `build/@Bundle/js/<view>.js`.
- The remaining five (`color_scheme`, `responsive`, `margins`, `animations`, `fonts`) append a usage-dimension suffix, e.g. `view.color-scheme.dark.css`.

src/Service/AssetsService.php wires the six services in CSS-loading order (default → color_scheme → responsive → margins → animations → fonts) and exposes `assetsDetect()`: for each file extension and each usage service, it walks the render node's inheritance stack and registers the first matching asset it finds. Assets are attached to `renderNode->assets` and added to `AssetsRegistryService`.

`buildTags()` in `AssetsService` decides which assets to server-side-render on an HTML response. For each type/context/usage combination it emits an `AssetTag` carrying the asset, or a placeholder tag when no asset was resolved. The placeholder tags let the front-end loader fill in usage variants that were not rendered server-side.

### Component management

src/Rendering/ComponentManagerLocatorService.php resolves a component name (e.g. `@WexampleSymfonyLoaderBundle/components/modal`) to an optional src/Rendering/ComponentManager/AbstractComponentManager.php via a tagged service locator. Manager classes live under `Rendering/ComponentManager/` and are tagged `symfony_loader.component_manager` by the service definition.

src/Service/ComponentService.php orchestrates the lifecycle:

1. Normalise the component name (resolves short bundle aliases to full bundle names).
2. Look up the manager; if none exists, fall back to a bare `ComponentRenderNode`.
3. Call `initRenderNode()` (registers the node, detects assets, pushes it onto the context stack).
4. Call `componentRenderBody()` if `$renderBody` is true: sets the translation domain, calls `ComponentRenderNode::render()` to get the Twig body, then reverts the domain and pops the context stack.

src/Twig/ComponentsExtension.php exposes all component functions to Twig (`component`, `component_init_class`, `component_init_parent`, `component_init_previous`, `component_frontend`, `component_lazy`) and registers `ComponentTokenParser` for the `{% component … %}{% endcomponent %}` block syntax.

### Vue integration

src/Service/VueService.php wraps a `.vue.html.twig` template in a `<template>` element, registers assets against the vue's root component render node, collects translations via `@vue::*`, and deduplicates repeated renders of the same view. On AJAX responses it attaches all rendered Vue templates to `AjaxLayoutRenderNode::vueTemplates` so the front-end can pick them up from the JSON payload.

### Serialisation

src/Rendering/RenderData.php is the output format. It extends `AdaptiveResponse` (adds `ok` and `responseType` fields) and wraps an associative data array. `toArray()` recursively normalises nested `RenderData` instances. Every render node, asset, and the assets registry implement `toRenderData()` through `RenderDataGenerator`, which uses reflection to serialise named properties and calls `toRenderData()` on nested `RenderDataGenerator` values.
