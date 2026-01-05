<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Twig\Environment;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyLoader\Service\ComponentService;
use Wexample\SymfonyLoader\Service\LayoutService;
use Wexample\SymfonyLoader\Service\PageService;
use Wexample\SymfonyTranslations\Translation\Translator;

class LayoutServiceTest extends TestCase
{
    public function testLayoutInitialInitDelegatesToLayoutInit(): void
    {
        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));

        /** @var LayoutService&MockObject $service */
        $service = $this->getMockBuilder(LayoutService::class)
            ->setConstructorArgs([
                $this->createStub(AssetsService::class),
                $this->createStub(ComponentService::class),
                $this->createStub(PageService::class),
                $this->createStub(Translator::class),
            ])
            ->onlyMethods(['layoutInit'])
            ->getMock();

        $service->expects($this->once())->method('layoutInit')->with($renderPass);

        $service->layoutInitialInit($this->createStub(Environment::class), $renderPass);
    }

    public function testLayoutInitInitializesLayoutAndPage(): void
    {
        $assetsService = $this->createMock(AssetsService::class);
        $pageService = $this->createMock(PageService::class);
        $translator = $this->createMock(Translator::class);

        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));
        $layoutRenderNode = new InitialLayoutRenderNode('test');
        $layoutRenderNode->setView('bundle/layout');
        $renderPass->setLayoutRenderNode($layoutRenderNode);

        $assetsService
            ->expects($this->once())
            ->method('assetsDetect')
            ->with(
                $renderPass,
                $layoutRenderNode,
            );

        $translator
            ->expects($this->once())
            ->method('setDomainFromTemplatePath')
            ->with($layoutRenderNode->getContextType(), $layoutRenderNode->getView())
            ->willReturn('domain');

        $pageService
            ->expects($this->once())
            ->method('pageInit')
            ->with(
                $renderPass,
                $this->isInstanceOf(\Wexample\SymfonyLoader\Rendering\RenderNode\PageRenderNode::class),
                $renderPass->getView()
            );

        $service = new LayoutService(
            $assetsService,
            $this->createStub(ComponentService::class),
            $pageService,
            $translator
        );

        $service->layoutInit($renderPass);
    }
}
