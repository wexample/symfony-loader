<?php

namespace Wexample\SymfonyLoader\Tests\Integration\Loader;

use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\Usage\ResponsiveAssetUsageService;
use Wexample\SymfonyLoader\Tests\Traits\LoaderTestCaseTrait;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;
use Wexample\SymfonyTesting\Traits\Rendering\TwigRenderTestCaseTrait;

class LoaderTestCaseTraitKernelRenderTest extends AbstractSymfonyKernelTestCase
{
    use TwigRenderTestCaseTrait;
    use LoaderTestCaseTrait;

    public function testGetPageLayoutDataExtractsLayoutRenderDataFromRenderedTemplate(): void
    {
        $projectDir = $this->getKernelProjectDir();

        $renderPass = new RenderPass(
            '@front/layout/test-layout-with-registry.html.twig',
            new AssetsRegistry($projectDir)
        );

        $renderPass->usagesConfig[ResponsiveAssetUsageService::getName()]['list'] = [];

        $env = self::getContainer()->hasParameter('loader.environment')
            ? (string) self::getContainer()->getParameter('loader.environment')
            : 'test';

        $layoutRenderNode = new InitialLayoutRenderNode($env);
        $layoutRenderNode->setView('@front/layout/test-layout-with-registry.html.twig');
        $renderPass->setLayoutRenderNode($layoutRenderNode);

        $this->renderTwig(
            '@front/layout/test-layout-with-registry.html.twig',
            [
                'render_pass' => $renderPass,
            ]
        );

        $layoutData = $this->getPageLayoutData();

        $this->assertNotEmpty($layoutData);
        $this->assertArrayHasKey('view', $layoutData);
        $this->assertArrayHasKey('renderRequestId', $layoutData);
        $this->assertArrayHasKey('page', $layoutData);
    }
}
