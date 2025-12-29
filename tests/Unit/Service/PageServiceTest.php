<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Routing\RouterInterface;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\PageRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyLoader\Service\PageService;
use Wexample\SymfonyTranslations\Translation\Translator;

class PageServiceTest extends TestCase
{
    public function testPageInitInitializesPageAndTranslator(): void
    {
        /** @var AssetsService&MockObject $assetsService */
        $assetsService = $this->createMock(AssetsService::class);
        $translator = $this->createMock(Translator::class);

        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));
        $page = new PageRenderNode();

        $assetsService
            ->expects($this->once())
            ->method('assetsDetect')
            ->with($renderPass, $page);

        $translator
            ->expects($this->once())
            ->method('setDomainFromTemplatePath')
            ->with($page->getContextType(), 'bundle/page')
            ->willReturn('domain');

        $service = new PageService(
            $assetsService,
            $translator,
            $this->createStub(RouterInterface::class)
        );

        $service->pageInit($renderPass, $page, 'bundle/page');
    }
}

