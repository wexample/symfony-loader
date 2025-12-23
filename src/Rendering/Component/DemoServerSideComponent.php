<?php

namespace Wexample\SymfonyLoader\Rendering\Component;

use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;

class DemoServerSideComponent extends ComponentRenderNode
{
    public function setBody(?string $body): void
    {
        parent::setBody('<b>✅ SERVER_SIDE_TEST</b>');
    }
}
