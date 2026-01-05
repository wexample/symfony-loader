<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;
use Wexample\SymfonyLoader\Twig\AdaptiveResponseExtension;

class AdaptiveResponseExtensionTest extends TestCase
{
    public function testFunctionsAndDelegation(): void
    {
        $service = $this->createMock(AdaptiveResponseService::class);
        $extension = new AdaptiveResponseExtension($service);

        $functions = $extension->getFunctions();
        $names = array_map(static fn (TwigFunction $f) => $f->getName(), $functions);
        $this->assertContains('adaptive_response_rendering_base_path', $names);

        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $service
            ->expects($this->once())
            ->method('getLayoutBasePath')
            ->with($renderPass)
            ->willReturn('path');
        $this->assertSame('path', $extension->adaptiveResponseRenderingBasePath($renderPass));
    }
}
