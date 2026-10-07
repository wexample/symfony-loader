<?php

namespace Wexample\SymfonyLoader\Twig;

use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;
use Symfony\Component\HttpFoundation\RequestStack;
use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Interface\HeadLinkProviderInterface;
use Wexample\SymfonyHelpers\Interface\HeadMetaProviderInterface;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyTranslations\Exception\MissingTranslationException;
use Wexample\SymfonyTranslations\Translation\Translator;

class BaseTemplateExtension extends AbstractExtension
{
    final public const DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY = '@page::page_title';
    final public const DEFAULT_APP_TITLE_TRANSLATION_KEY = 'front.app.global::name';
    final public const DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY = 'front.app.global::meta.description';

    /**
     * @param iterable<HeadMetaProviderInterface> $headMetaProviders
     * @param iterable<HeadLinkProviderInterface> $headLinkProviders
     */
    public function __construct(
        protected Translator $translator,
        protected RequestStack $requestStack,
        #[AutowireIterator(HeadMetaProviderInterface::TAG)]
        private readonly iterable $headMetaProviders = [],
        #[AutowireIterator(HeadLinkProviderInterface::TAG)]
        private readonly iterable $headLinkProviders = [],
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

        $resolvedLayoutTitle = $layoutTitle ?: $this->translateOptional(
            self::DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY,
            $layoutTitleParameters
        );

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
                'description' => $this->translateOptional(self::DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY),
            ] + $defaults;

        $values = array_filter(
            array_merge($resolvedDefaults, $meta),
            static fn ($value): bool => null !== $value && '' !== trim((string) $value)
        );

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
            'description' => $description ?: $this->translateOptional(self::DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY),
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
