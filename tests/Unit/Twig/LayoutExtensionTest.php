<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Twig\Environment;
use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\LayoutService;
use Wexample\SymfonyLoader\Twig\LayoutExtension;

class LayoutExtensionTest extends TestCase
{
    public function testFunctionsAndDelegation(): void
    {
        $service = $this->createMock(LayoutService::class);
        $extension = new LayoutExtension($service);

        $functions = $extension->getFunctions();
        $names = array_map(static fn (TwigFunction $f) => $f->getName(), $functions);
        $this->assertContains('layout_initial_init', $names);
        $this->assertContains('layout_render_initial_data', $names);

        $twig = $this->createStub(Environment::class);
        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $service->expects($this->once())->method('layoutInitialInit')->with($twig, $renderPass);
        $extension->layoutInitialInit($twig, $renderPass);
    }

    public function testLayoutRenderInitialDataReturnsLayoutRenderData(): void
    {
        $service = $this->createStub(LayoutService::class);
        $extension = new LayoutExtension($service);

        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));
        $layout = $this->createStub(InitialLayoutRenderNode::class);
        $layout->method('toRenderData')->willReturn(['ok' => true]);
        $renderPass->setLayoutRenderNode($layout);

        $data = $extension->layoutRenderInitialData($renderPass);
        $this->assertSame(['ok' => true], $data);
    }
}
