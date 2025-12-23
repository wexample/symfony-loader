<?php

namespace Wexample\SymfonyDesignSystem\Rendering\RenderNode;

use Wexample\SymfonyDesignSystem\Helper\RenderingHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Rendering\Traits\WithRenderRequestId;

abstract class AbstractLayoutRenderNode extends AbstractRenderNode
{
    use WithRenderRequestId;

    public PageRenderNode $page;

    public function __construct(
        protected readonly string $env
    ) {

    }

    public function getContextType(): string
    {
        return RenderingHelper::CONTEXT_LAYOUT;
    }

    public function toRenderData(): array
    {
        return parent::toRenderData()
            + $this->serializeVariables([
                'env',
                'renderRequestId',
                'page',
            ])
            + ['templates' => $this->getComponentsTemplates()];
    }

    public function init(
        RenderPass $renderPass,
        string $view,
    ): void {
        parent::init($renderPass, $view);

        $this->setRenderRequestId(
            $renderPass->getRenderRequestId()
        );

        $renderPass->setCurrentContextRenderNode(
            $this
        );
    }

    public function createLayoutPageInstance(): PageRenderNode
    {
        $this->page = new PageRenderNode();

        return $this->page;
    }
}
