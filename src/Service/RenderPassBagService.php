<?php

namespace Wexample\SymfonyLoader\Service;

use Wexample\SymfonyLoader\Rendering\RenderPass;

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
