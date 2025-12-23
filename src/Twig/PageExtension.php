<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyDesignSystem\Service\PageService;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class PageExtension extends AbstractExtension
{
    public function __construct(
        private readonly PageService $pageService,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'page_translation_path_from_route',
                [
                    $this,
                    'pageTranslationPathFromRoute',
                ]
            ),
        ];
    }

    public function pageTranslationPathFromRoute(string $route): string
    {
        return $this->pageService->pageTranslationPathFromRoute(
            $route
        );
    }
}
