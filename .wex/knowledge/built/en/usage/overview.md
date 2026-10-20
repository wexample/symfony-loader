`symfony-loader` is a Symfony bundle that replaces the standard `render()` call with `adaptiveRender()`, routing each request through a `RenderPass` that selects between a full HTML response and a JSON envelope depending on whether the request is XHR. Controllers extending `AbstractLoaderController` inherit this pipeline, which also collects and injects Webpack Encore assets — CSS variants for color scheme, responsive breakpoints, density, skin, fonts, and animations — at the end of every HTML response. It targets Symfony developers who need a single rendering path that handles both initial page loads and dynamic partial updates without duplicating controller logic.

## What a page says of itself in the head

Each page names itself in its own translation file, beside what the application says of itself:

| Head | Page key | Application key |
|---|---|---|
| `<title>` | `page_title` | `front.app.global::name`, appended after a ` \| ` |
| `<meta name="description">`, `og:description` | `page_description` | `front.app.global::meta.description`, in its place when the page has none |

A template may still set `document_title` or `document_meta_description` itself, which wins over both. Without `page_description`, every page of a site shares one description, which a search engine then ignores.
