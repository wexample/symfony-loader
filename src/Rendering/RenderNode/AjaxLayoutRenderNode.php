<?php

namespace Wexample\SymfonyDesignSystem\Rendering\RenderNode;

use Wexample\SymfonyHelpers\Class\Traits\WithBodyClassTrait;

class AjaxLayoutRenderNode extends AbstractLayoutRenderNode
{
    use WithBodyClassTrait;

    public bool $hasAssets = false;

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
