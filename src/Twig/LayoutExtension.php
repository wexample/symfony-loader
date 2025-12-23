<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Exception;
use Twig\Environment;
use Twig\TwigFunction;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Service\LayoutService;
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
                'layout_init',
                [
                    $this,
                    'layoutInit',
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
    public function layoutInit(
        Environment $twig,
        RenderPass $renderPass,
    ): void {
        $this->layoutService->layoutInitInitial(
            $twig,
            $renderPass,
        );
    }

    public function layoutRenderInitialData(RenderPass $renderPass): array
    {
        return $renderPass
            ->layoutRenderNode
            ->toRenderData();
    }
}
