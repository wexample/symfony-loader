<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

class InitialLayoutRenderNode extends AbstractLayoutRenderNode
{
    public function createLayoutPageInstance(): PageRenderNode
    {
        $page = parent::createLayoutPageInstance();
        $page->isInitialPage = true;

        return $page;
    }
}
