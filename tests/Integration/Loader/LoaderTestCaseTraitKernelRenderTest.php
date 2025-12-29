<?php

namespace Wexample\SymfonyLoader\Tests\Integration\Loader;

use Twig\Environment;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\Usage\ResponsiveAssetUsageService;
use Wexample\SymfonyLoader\Tests\Traits\LoaderTestCaseTrait;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

class LoaderTestCaseTraitKernelRenderTest extends AbstractSymfonyKernelTestCase
{
    use LoaderTestCaseTrait;

    private string $renderedContent = '';

    public function content(): string
    {
        return $this->renderedContent;
    }

    public function testGetPageLayoutDataExtractsLayoutRenderDataFromRenderedTemplate(): void
    {
        self::bootKernel();

        /** @var Environment $twig */
        $twig = self::getContainer()->get('twig');
        $projectDir = self::getContainer()->getParameter('kernel.project_dir');

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

        $this->renderedContent = $twig->render(
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
