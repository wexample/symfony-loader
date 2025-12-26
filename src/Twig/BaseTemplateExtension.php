<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyTranslations\Translation\Translator;
use Symfony\Component\HttpFoundation\RequestStack;

class BaseTemplateExtension extends AbstractExtension
{
    final public const DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY = '@page::page_title';
    final public const DEFAULT_APP_TITLE_TRANSLATION_KEY = 'front.app.global::name';
    final public const DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY = 'front.app.global::meta.description';

    public function __construct(
        protected Translator $translator,
        protected RequestStack $requestStack,
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
                ]
                ,
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

        $resolvedLayoutTitle = $layoutTitle ?: $this->translator->trans(
            self::DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY,
            $layoutTitleParameters
        );

        $resolvedAppTitle = $appTitle ?: $this->translator->trans(
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
                'description' => $this->translator->trans(self::DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY),
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

    public function baseTemplateRenderCanonical(?string $canonical = null): string
    {
        if (null !== $canonical && '' !== trim($canonical)) {
            return $canonical;
        }

        $request = $this->requestStack->getCurrentRequest();

        if (!$request) {
            return '';
        }

        // Remove query/fragment, keep normalized path.
        $path = $request->getPathInfo();

        return rtrim($request->getSchemeAndHttpHost(), '/') . $path;
    }
}
