<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Rendering;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;

class AjaxLayoutRenderNodeTest extends TestCase
{
    public function testToRenderDataIncludesVueTemplatesAndLayoutFields(): void
    {
        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));
        $renderPass->setRenderRequestId('rid');

        $node = new AjaxLayoutRenderNode('dev');
        $node->vueTemplates = ['tpl1'];
        $node->init($renderPass, 'bundle/layout');

        $page = $node->createLayoutPageInstance();
        $page->init($renderPass, 'bundle/page');

        $data = $node->toRenderData();

        $this->assertSame('dev', $data['env']);
        $this->assertSame(['tpl1'], $data['vueTemplates']);
        $this->assertSame('bundle/page', $data['page']['view']);
    }
}
