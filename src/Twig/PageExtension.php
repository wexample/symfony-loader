<?php

namespace Wexample\SymfonyLoader\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyLoader\Service\PageService;

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
