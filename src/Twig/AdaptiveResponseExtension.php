<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Service\AdaptiveResponseService;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class AdaptiveResponseExtension extends AbstractExtension
{
    /**
     * CommonExtension constructor.
     */
    public function __construct(
        protected AdaptiveResponseService $adaptiveResponseService,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'adaptive_response_rendering_base_path',
                [
                    $this,
                    'adaptiveResponseRenderingBasePath',
                ]
            ),
        ];
    }

    /**
     * Return base layout path regarding request type
     * and template configuration.
     */
    public function adaptiveResponseRenderingBasePath(
        RenderPass $renderPass,
    ): string {
        return $this->adaptiveResponseService->getLayoutBasePath(
            $renderPass,
        );
    }
}
