`symfony-loader` is a Symfony bundle that replaces the standard `render()` call with `adaptiveRender()`, routing each request through a `RenderPass` that selects between a full HTML response and a JSON envelope depending on whether the request is XHR. Controllers extending `AbstractLoaderController` inherit this pipeline, which also collects and injects Webpack Encore assets — CSS variants for color scheme, responsive breakpoints, density, skin, fonts, and animations — at the end of every HTML response. It targets Symfony developers who need a single rendering path that handles both initial page loads and dynamic partial updates without duplicating controller logic.

## What a page says of itself in the head

Each page names itself in its own translation file, beside what the application says of itself:

| Head | Page key | Application key |
|---|---|---|
| `<title>` | `document_title`, else `page_title` | `front.app.global::name`, appended after a ` \| ` |
| `<meta name="description">`, `og:description` | `page_description` | `front.app.global::meta.description`, in its place when the page has none |

`page_title` also labels the page in the menu, beside its neighbours; `document_title` is what it is called alone, in a search result or a tab — `Data` in the menu, `Tables, file explorers and live lists — Design system` in the head.

A template may still set the `document_title` or `document_meta_description` variable itself, which wins over both. Without `page_description`, every page of a site shares one description, which a search engine then ignores. A page about an entity names it in `document_subject`, which symfony-seo describes in schema.org's words.

## What a bundle needs the application to give it

A bundle names the variables and the keys it cannot work without by implementing `Interface\RequirementProviderInterface` — tagged by the interface alone. Each is a `Class\Requirement`: a name, whether it is met, and how to give it; `Requirement::env('NAME', $hint)` checks a variable set to something.

```php
class MailRequirementProvider implements RequirementProviderInterface
{
    public function getRequirements(): iterable
    {
        yield Requirement::env('MAILER_FROM', 'Set it to the sender address.');
    }
}
```

`RequirementsService` gathers them, and fails on the missing ones all at once:

- in development, the container being built refuses to start (`RequirementsCacheWarmer`): the next page answers 500, naming each one, and `cache:clear` fails the same way. Not in `test`: a fixture application gives what its tests use;
- in production, `bin/console loader:requirements` lists them and exits 1 when one is missing — run it at the container's start, before it takes requests. The cache is not checked there: an image is built where the production environment is not yet.
