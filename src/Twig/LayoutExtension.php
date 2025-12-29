<?php

namespace Wexample\SymfonyLoader\Twig;

use Exception;
use Twig\Environment;
use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\LayoutService;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class LayoutExtension extends AbstractExtension
{
    public function __construct(
        private readonly LayoutService $layoutService,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'layout_initial_init',
                [
                    $this,
                    'layoutInitialInit',
                ],
                [
                    self::FUNCTION_OPTION_NEEDS_ENVIRONMENT => true,
                ]
            ),
            new TwigFunction(
                'layout_render_initial_data',
                [
                    $this,
                    'layoutRenderInitialData',
                ]
            ),
        ];
    }

    /**
     * @throws Exception
     */
    public function layoutInitialInit(
        Environment $twig,
        RenderPass $renderPass,
    ): void {
        $this->layoutService->layoutInitialInit(
            $twig,
            $renderPass,
        );
    }

    public function layoutRenderInitialData(RenderPass $renderPass): array
    {
        return $renderPass
            ->getLayoutRenderNode()
            ->toRenderData();
    }
}
