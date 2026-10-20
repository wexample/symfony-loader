<?php

namespace Wexample\SymfonyLoader\Twig;

use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;
use Symfony\Component\HttpFoundation\RequestStack;
use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Interface\HeadLinkProviderInterface;
use Wexample\SymfonyHelpers\Interface\HeadMetaProviderInterface;
use Wexample\SymfonyHelpers\Interface\HeadStructuredDataProviderInterface;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyTranslations\Exception\MissingTranslationException;
use Wexample\SymfonyTranslations\Translation\Translator;

class BaseTemplateExtension extends AbstractExtension
{
    final public const DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY = '@page::page_title';
    final public const DEFAULT_DOCUMENT_TITLE_TRANSLATION_KEY = '@page::document_title';
    final public const DEFAULT_APP_TITLE_TRANSLATION_KEY = 'front.app.global::name';
    final public const DEFAULT_PAGE_DESCRIPTION_TRANSLATION_KEY = '@page::page_description';
    final public const DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY = 'front.app.global::meta.description';

    /**
     * @param iterable<HeadMetaProviderInterface> $headMetaProviders
     * @param iterable<HeadLinkProviderInterface> $headLinkProviders
     * @param iterable<HeadStructuredDataProviderInterface> $headStructuredDataProviders
     */
    public function __construct(
        protected readonly Translator $translator,
        protected readonly RequestStack $requestStack,
        #[AutowireIterator(HeadMetaProviderInterface::TAG)]
        private readonly iterable $headMetaProviders = [],
        #[AutowireIterator(HeadLinkProviderInterface::TAG)]
        private readonly iterable $headLinkProviders = [],
        #[AutowireIterator(HeadStructuredDataProviderInterface::TAG)]
        private readonly iterable $headStructuredDataProviders = [],
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'base_template_render_title',
                [
                    $this,
                    'baseTemplateRenderTitle',
                ]
            ),
            new TwigFunction(
                'base_template_render_meta',
                [
                    $this,
                    'baseTemplateRenderMeta',
                ],
                [
                    'is_safe' => ['html'],
                ]
            ),
            new TwigFunction(
                'base_template_render_head_structured_data',
                [
                    $this,
                    'baseTemplateRenderHeadStructuredData',
                ],
                [
                    'is_safe' => ['html'],
                ]
            ),
            new TwigFunction(
                'base_template_render_head_meta',
                [
                    $this,
                    'baseTemplateRenderHeadMeta',
                ],
                [
                    'is_safe' => ['html'],
                ]
            ),
            new TwigFunction(
                'base_template_render_head_links',
                [
                    $this,
                    'baseTemplateRenderHeadLinks',
                ],
                [
                    'is_safe' => ['html'],
                ]
            ),
            new TwigFunction(
                'base_template_render_canonical',
                [
                    $this,
                    'baseTemplateRenderCanonical',
                ]
            ),
        ];
    }

    public function baseTemplateRenderTitle(
        ?string $documentTitle = null,
        ?string $layoutTitle = null,
        array $layoutTitleParameters = [],
        ?string $appTitle = null,
        array $appTitleParameters = [],
    ): string {
        if ($documentTitle !== null && '' !== trim($documentTitle)) {
            return $documentTitle;
        }

        // What the page is called outside the menu — a search result, a tab —
        // where its menu label alone, among its neighbours, would say little.
        $resolvedLayoutTitle = $layoutTitle
            ?: $this->translateOptional(self::DEFAULT_DOCUMENT_TITLE_TRANSLATION_KEY, $layoutTitleParameters)
            ?? $this->translateOptional(self::DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY, $layoutTitleParameters);

        $resolvedAppTitle = $appTitle ?: $this->translateOptional(
            self::DEFAULT_APP_TITLE_TRANSLATION_KEY,
            $appTitleParameters
        );

        $parts = array_filter(
            [
                $resolvedLayoutTitle,
                $resolvedAppTitle,
            ],
            static fn (?string $value): bool => null !== $value && '' !== trim($value)
        );

        return implode(' | ', $parts);
    }

    /**
     * A key the page may or may not define, since these are defaults the
     * caller did not ask for: an application naming no title of its own has
     * none, which is not the same as having a broken one. The plain translator
     * answers an undefined key with the key — in the title of the document, and
     * by throwing where it is strict, which is the test environment.
     *
     * @return string|null Null when no catalogue of the locale chain defines it
     */
    private function translateOptional(string $key, array $parameters = []): ?string
    {
        try {
            $translated = $this->translator->trans($key, $parameters);
        } catch (MissingTranslationException) {
            return null;
        }

        return str_contains($translated, Translator::DOMAIN_SEPARATOR)
            ? null
            : $translated;
    }

    /**
     * What the page says of itself, as `page_title` names it: the one it was
     * given, else the `page_description` of its own translations, else the
     * application's. Without the middle step every page of a site shares one
     * description, which a search engine then ignores.
     */
    private function resolveDescription(?string $description = null): ?string
    {
        if (null !== $description && '' !== trim($description)) {
            return $description;
        }

        return $this->translateOptional(self::DEFAULT_PAGE_DESCRIPTION_TRANSLATION_KEY)
            ?? $this->translateOptional(self::DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY);
    }

    /**
     * Render meta tags from a provided map, with sensible defaults for common keys.
     *
     * @param array<string, string|null> $meta
     * @param array<string, string|null> $defaults
     */
    public function baseTemplateRenderMeta(
        array $meta = [],
        array $defaults = [],
    ): string {
        $resolvedDefaults = [
                'description' => $this->resolveDescription(),
            ] + $defaults;

        $isSet = static fn ($value): bool => null !== $value && '' !== trim((string) $value);
        // A key the page leaves empty keeps its default: the base template
        // passes `description` whether the page set one or not.
        $values = array_filter(array_merge($resolvedDefaults, array_filter($meta, $isSet)), $isSet);

        $fragments = [];

        foreach ($values as $name => $content) {
            $fragments[] = sprintf(
                '<meta name="%s" content="%s">',
                htmlspecialchars((string) $name, \ENT_QUOTES | \ENT_SUBSTITUTE, 'UTF-8'),
                htmlspecialchars((string) $content, \ENT_QUOTES | \ENT_SUBSTITUTE, 'UTF-8')
            );
        }

        return implode("\n", $fragments);
    }

    /**
     * What the installed bundles add to the head, told what the page already
     * says of itself: its title, its description, its address.
     */
    public function baseTemplateRenderHeadMeta(
        string $title,
        ?string $description = null,
        ?string $url = null,
    ): string {
        $document = [
            'title' => $title,
            'description' => $this->resolveDescription($description),
            'url' => $url ?: null,
        ];
        $fragments = [];

        foreach ($this->headMetaProviders as $provider) {
            foreach ($provider->getHeadMeta($document) as $attributes) {
                $fragments[] = $this->renderHeadTag('meta', $attributes);
            }
        }

        return implode("\n", $fragments);
    }

    /**
     * What the installed bundles tell the search engines of the page, each
     * object a JSON-LD block. Data and not a script: nothing runs it, so no
     * nonce, but a `</script>` inside a value must not close it, hence the hex.
     */
    public function baseTemplateRenderHeadStructuredData(
        string $title,
        ?string $description = null,
        ?string $url = null,
    ): string {
        $document = [
            'title' => $title,
            'description' => $this->resolveDescription($description),
            'url' => $url ?: null,
        ];
        $fragments = [];

        foreach ($this->headStructuredDataProviders as $provider) {
            foreach ($provider->getHeadStructuredData($document) as $object) {
                $fragments[] = '<script type="application/ld+json">' . json_encode(
                    $object,
                    \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE | \JSON_HEX_TAG | \JSON_THROW_ON_ERROR
                ) . '</script>';
            }
        }

        return implode("\n", $fragments);
    }

    /**
     * What the installed bundles link from the head: files the page will
     * need, printed ahead of its assets so they are asked for first.
     */
    public function baseTemplateRenderHeadLinks(): string
    {
        $fragments = [];

        foreach ($this->headLinkProviders as $provider) {
            foreach ($provider->getHeadLinks() as $attributes) {
                $fragments[] = $this->renderHeadTag('link', $attributes);
            }
        }

        return implode("\n", $fragments);
    }

    private function renderHeadTag(string $tagName, array $attributes): string
    {
        return '<' . $tagName . implode('', array_map(
            static fn (string $name, string $value): string => sprintf(
                ' %s="%s"',
                htmlspecialchars($name, \ENT_QUOTES | \ENT_SUBSTITUTE, 'UTF-8'),
                htmlspecialchars($value, \ENT_QUOTES | \ENT_SUBSTITUTE, 'UTF-8')
            ),
            array_keys($attributes),
            $attributes
        )) . '>';
    }

    public function baseTemplateRenderCanonical(?string $canonical = null): string
    {
        if (null !== $canonical && '' !== trim($canonical)) {
            return $canonical;
        }

        $request = $this->requestStack->getCurrentRequest();

        if (! $request) {
            return '';
        }

        // Remove query/fragment, keep normalized path.
        $path = $request->getPathInfo();

        return rtrim($request->getSchemeAndHttpHost(), '/') . $path;
    }
}
