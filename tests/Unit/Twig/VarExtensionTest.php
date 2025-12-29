<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\JsService;
use Wexample\SymfonyLoader\Twig\VarExtension;

class VarExtensionTest extends TestCase
{
    public function testFunctionsAndDelegation(): void
    {
        $service = $this->createMock(JsService::class);
        $extension = new VarExtension($service);

        $functions = $extension->getFunctions();
        $names = array_map(static fn (TwigFunction $f) => $f->getName(), $functions);
        $this->assertContains('var_export', $names);
        $this->assertContains('var_env_export', $names);

        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));

        $service->expects($this->once())->method('varEnvExport')->with($renderPass, 'name');
        $extension->varEnvExport($renderPass, 'name');

        $service->expects($this->once())->method('varExport')->with($renderPass, 'name', ['v']);
        $extension->varExport($renderPass, 'name', ['v']);
    }
}

