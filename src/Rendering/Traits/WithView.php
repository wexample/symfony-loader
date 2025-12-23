<?php

namespace Wexample\SymfonyDesignSystem\Rendering\Traits;

trait WithView
{
    protected ?string $view = null;

    public function getView(): ?string
    {
        return $this->view;
    }

    public function setView(string $view): void
    {
        $this->view = $view;
    }
}
