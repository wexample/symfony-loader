<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Wexample\SymfonyHelpers\Class\Traits\WithBodyClassTrait;

class AjaxLayoutRenderNode extends AbstractLayoutRenderNode
{
    use WithBodyClassTrait;

    protected bool $hasAssets = false;

    public array $vueTemplates = [];

    public function toRenderData(): array
    {
        return parent::toRenderData()
            + $this->serializeVariables([
                'body',
                'vueTemplates',
            ]);
    }
}
