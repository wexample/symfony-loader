<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyLoader\Service\Usage\AnimationsAssetUsageService;
use Wexample\SymfonyLoader\Service\Usage\ColorSchemeAssetUsageService;
use Wexample\SymfonyLoader\Service\Usage\DefaultAssetUsageService;
use Wexample\SymfonyLoader\Service\Usage\FontsAssetUsageService;
use Wexample\SymfonyLoader\Service\Usage\MarginsAssetUsageService;
use Wexample\SymfonyLoader\Service\Usage\ResponsiveAssetUsageService;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

class AssetsServiceTest extends AbstractSymfonyKernelTestCase
{
    protected function getTestServiceClass(): string
    {
        return AssetsService::class;
    }

    protected function getTestService(): object
    {
        return self::getContainer()->get(
            $this->getTestServiceClass()
        );
    }

    public function testAssetIsReadyForRender()
    {
        $renderPass = new RenderPass(
            view: 'test',
            assetsRegistry: new AssetsRegistry(
                projectDir: self::getContainer()->getParameter('kernel.project_dir')
            )
        );

        $this->checkAssetIsReadyForRenderDefault($renderPass);
        $this->checkAssetIsReadyForRenderResponsive($renderPass);
    }

    private function checkAssetIsReadyForRenderDefault(RenderPass $renderPass)
    {
        /** @var AssetsService $service */
        $service = $this->getTestService();

        $asset = new Asset(
            'test.css',
            DefaultAssetUsageService::getName(),
            Asset::CONTEXT_PAGE
        );

        $this->assertTrue($service->assetNeedsInitialRender(
            $asset,
            $renderPass,
        ));
    }


    private function checkAssetIsReadyForRenderResponsive(RenderPass $renderPass)
    {
        /** @var AssetsService $service */
        $service = $this->getTestService();

        $asset = new Asset(
            'test.css',
            ResponsiveAssetUsageService::getName(),
            Asset::CONTEXT_PAGE
        );

        // Do not check needs initial render, as we are not sure of what we expect.

        // When JS is disabled, responsive will render css assets
        // with media query attributes as a fallback mechanism.
        $renderPass->setUseJs(false);
        $this->assertTrue($service->assetNeedsInitialRender(
            $asset,
            $renderPass,
        ));

        // Rollback
        $renderPass->setUseJs(true);
    }

    public function testGetAssetsUsagesStaticContainsAllUsages(): void
    {
        $this->assertSame(
            [
                AnimationsAssetUsageService::class,
                ColorSchemeAssetUsageService::class,
                DefaultAssetUsageService::class,
                MarginsAssetUsageService::class,
                ResponsiveAssetUsageService::class,
                FontsAssetUsageService::class,
            ],
            AssetsService::getAssetsUsagesStatic()
        );
    }
}
