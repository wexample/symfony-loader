<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Wexample\SymfonyLoader\Helper\RenderingHelper;

class PageRenderNode extends AbstractRenderNode
{
    public bool $isInitialPage = false;

    public function getContextType(): string
    {
        return RenderingHelper::CONTEXT_PAGE;
    }

    public function toRenderData(): array
    {
        return parent::toRenderData()
            + $this->serializeVariables([
                'isInitialPage',
            ]);
    }
}
