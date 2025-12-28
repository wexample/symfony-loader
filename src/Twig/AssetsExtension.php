<?php

namespace Wexample\SymfonyLoader\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class AssetsExtension extends AbstractExtension
{
    public function __construct(
        protected AssetsService $assetsService,
        protected AssetsRegistryService $assetsRegistryService
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'assets_build_tags',
                [
                    $this,
                    'assetsBuildTags',
                ]
            ),
            new TwigFunction(
                'assets_registry',
                [
                    $this,
                    'assetsRegistry',
                ]
            ),
        ];
    }

    public function assetsBuildTags(
        RenderPass $renderPass,
    ): array {
        return $this
            ->assetsService
            ->buildTags(
                $renderPass,
            );
    }

    public function assetsRegistry(RenderPass $renderPass): array
    {
        return $this
            ->assetsRegistryService
            ->toRenderData();
    }
}
