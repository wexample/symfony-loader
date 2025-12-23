<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Wexample\SymfonyDesignSystem\Rendering\RenderPass;

class RenderPassBagService
{
    private ?RenderPass $renderPass = null;

    public function getRenderPass(): ?RenderPass
    {
        return $this->renderPass;
    }

    public function setRenderPass(?RenderPass $renderPass): void
    {
        $this->renderPass = $renderPass;
    }

}
