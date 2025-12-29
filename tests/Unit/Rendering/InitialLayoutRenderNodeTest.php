<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Rendering;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;

class InitialLayoutRenderNodeTest extends TestCase
{
    public function testToRenderDataIncludesLayoutFields(): void
    {
        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));
        $renderPass->setRenderRequestId('rid');

        $node = new InitialLayoutRenderNode('dev');
        $node->init($renderPass, 'bundle/layout');

        $page = $node->createLayoutPageInstance();
        $page->init($renderPass, 'bundle/page');

        $data = $node->toRenderData();

        $this->assertSame('dev', $data['env']);
        $this->assertSame('rid', $data['renderRequestId']);
        $this->assertSame('bundle/page', $data['page']['view']);
    }
}
