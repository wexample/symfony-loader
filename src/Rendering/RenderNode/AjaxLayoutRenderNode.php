<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Wexample\SymfonyHelpers\Class\Traits\WithBodyClassTrait;

class AjaxLayoutRenderNode extends AbstractLayoutRenderNode
{
    use WithBodyClassTrait;

    protected bool $hasAssets = false;

    public array $vueTemplates = [];

    public function toRenderData(): \Wexample\SymfonyLoader\Rendering\RenderData
    {
        $renderData = parent::toRenderData();
        $renderData->merge(
            $this->serializeVariables([
                'body',
                'vueTemplates',
            ])
        );

        return $renderData;
    }
}
