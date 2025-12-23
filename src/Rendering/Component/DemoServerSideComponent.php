<?php

namespace Wexample\SymfonyDesignSystem\Rendering\Component;

use Wexample\SymfonyDesignSystem\Rendering\RenderNode\ComponentRenderNode;

class DemoServerSideComponent extends ComponentRenderNode
{
    public function setBody(?string $body): void
    {
        parent::setBody('<b>✅ SERVER_SIDE_TEST</b>');
    }
}
