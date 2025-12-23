<?php

namespace Wexample\SymfonyDesignSystem\Rendering\Traits;

trait WithRenderRequestId
{
    protected string $renderRequestId;

    public function getRenderRequestId(): string
    {
        return $this->renderRequestId;
    }

    public function setRenderRequestId(string $renderRequestId): void
    {
        $this->renderRequestId = $renderRequestId;
    }
}
