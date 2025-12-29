<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyLoader\Twig\AssetsExtension;

class AssetsExtensionTest extends TestCase
{
    public function testFunctionsAndDelegation(): void
    {
        $assetsService = $this->createMock(AssetsService::class);
        $assetsRegistryService = $this->createMock(AssetsRegistryService::class);
        $extension = new AssetsExtension($assetsService, $assetsRegistryService);

        $functions = $extension->getFunctions();
        $names = array_map(static fn (TwigFunction $f) => $f->getName(), $functions);
        $this->assertContains('assets_build_tags', $names);
        $this->assertContains('assets_registry', $names);

        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $assetsService
            ->expects($this->once())
            ->method('buildTags')
            ->with($renderPass)
            ->willReturn(['ok']);
        $this->assertSame(['ok'], $extension->assetsBuildTags($renderPass));

        $assetsRegistryService
            ->expects($this->once())
            ->method('toRenderData')
            ->willReturn(['registry' => true]);
        $this->assertSame(['registry' => true], $extension->assetsRegistry($renderPass));
    }
}

