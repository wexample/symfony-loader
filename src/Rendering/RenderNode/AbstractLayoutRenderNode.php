<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\RenderData;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Rendering\Traits\WithRenderRequestId;

abstract class AbstractLayoutRenderNode extends AbstractRenderNode
{
    use WithRenderRequestId;

    protected PageRenderNode $page;

    public function __construct(
        protected readonly string $env
    ) {

    }

    public function getPage(): PageRenderNode
    {
        return $this->page;
    }

    public function getContextType(): string
    {
        return RenderingHelper::CONTEXT_LAYOUT;
    }

    /**
     * What an agent is told of each vue the page draws, by view
     * (AgentContractService): with the templates, the one thing a vue needs
     * that its own render data does not carry, since it has none.
     *
     * @var array<string, array>
     */
    public array $vueContracts = [];

    /**
     * What the bundles add to the layout's render data, by key
     * (LayoutRenderDataProviderInterface): spread beside the layout's own.
     *
     * @var array<string, mixed>
     */
    public array $extra = [];

    public function toRenderData(): RenderData
    {
        $renderData = parent::toRenderData();
        $renderData->merge(
            $this->serializeVariables([
                'env',
                'renderRequestId',
                'page',
                'vueContracts',
            ])
            + $this->extra
            + ['templates' => $this->getComponentsTemplates()]
        );

        return $renderData;
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
