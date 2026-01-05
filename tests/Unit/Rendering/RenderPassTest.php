<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Rendering;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;

class RenderPassTest extends TestCase
{
    public function testContextRenderNodeStackPushPop(): void
    {
        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $nodeA = new class () extends AbstractRenderNode {
            public function getContextType(): string
            {
                return 'layout';
            }
        };
        $nodeA->setView('view-a');

        $nodeB = new class () extends AbstractRenderNode {
            public function getContextType(): string
            {
                return 'layout';
            }
        };
        $nodeB->setView('view-b');

        $renderPass->registerContextRenderNode($nodeA);
        $renderPass->registerContextRenderNode($nodeB);

        $renderPass->setCurrentContextRenderNodeByTypeAndName('layout', 'view-a');
        $renderPass->setCurrentContextRenderNodeByTypeAndName('layout', 'view-b');

        $this->assertSame($nodeB, $renderPass->getCurrentContextRenderNode());

        $renderPass->revertCurrentContextRenderNode();
        $this->assertSame($nodeA, $renderPass->getCurrentContextRenderNode());

        $renderPass->revertCurrentContextRenderNode();
        $this->assertNull($renderPass->getCurrentContextRenderNode());
    }

    public function testFlagsAndOutputTypeHelpers(): void
    {
        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $this->assertFalse($renderPass->isDebug());
        $renderPass->setDebug(true);
        $this->assertTrue($renderPass->isDebug());

        $this->assertTrue($renderPass->isHtmlRequest());
        $this->assertFalse($renderPass->isJsonRequest());

        $renderPass->setOutputType(RenderPass::OUTPUT_TYPE_RESPONSE_JSON);
        $this->assertTrue($renderPass->isJsonRequest());
        $this->assertFalse($renderPass->isHtmlRequest());

        $this->assertTrue($renderPass->isUseJs());
        $renderPass->setUseJs(false);
        $this->assertFalse($renderPass->isUseJs());

        $this->assertSame(RenderPass::BASE_DEFAULT, $renderPass->getLayoutBase());
        $renderPass->setLayoutBase(RenderPass::BASE_MODAL);
        $this->assertSame(RenderPass::BASE_MODAL, $renderPass->getLayoutBase());
    }

    public function testSetUsageSkipsUnknownUsage(): void
    {
        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $renderPass->setUsage('unknown', 'value');
        $this->assertArrayNotHasKey('unknown', $renderPass->usages);

        $renderPass->usagesConfig = ['known' => ['list' => []]];
        $renderPass->setUsage('known', 'val');
        $this->assertSame('val', $renderPass->getUsage('known'));
    }

    public function testRenderNodeInitRegistersNode(): void
    {
        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));

        $node = new class () extends AbstractRenderNode {
            public function getContextType(): string
            {
                return 'page';
            }
        };

        $node->init($renderPass, 'bundle/view.twig');

        $this->assertSame('bundle/view.twig', $node->getView());
        $this->assertNotEmpty($node->toRenderData()['id'] ?? null);
        $this->assertSame($node, $renderPass->registry['page']['bundle/view.twig'] ?? null);
    }
}
