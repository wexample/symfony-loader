<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Wexample\SymfonyDesignSystem\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;

abstract class RenderNodeService
{
    public function __construct(
        protected AssetsService $assetsService,
    ) {
    }

    /**
     * Render node path or name are created after class construction,
     * as layout name is given by the template and so undefined
     * on layout render node class instantiation.
     */
    public function initRenderNode(
        AbstractRenderNode $renderNode,
        RenderPass $renderPass,
        string $view,
    ): void {
        $renderNode->init(
            $renderPass,
            $view,
        );

        if ($renderNode->hasAssets) {
            $this->assetsService->assetsDetect(
                $renderPass,
                $renderNode,
            );
        }
    }
}
