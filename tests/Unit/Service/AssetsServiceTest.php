<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsAggregationService;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;
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

    public function testGetAssetsUsagesReturnsRegisteredUsages(): void
    {
        /** @var AssetsService $service */
        $service = $this->getTestService();

        $usages = $service->getAssetsUsages();

        $this->assertNotEmpty($usages);
        $this->assertArrayHasKey(DefaultAssetUsageService::getName(), $usages);
        $this->assertArrayHasKey(ResponsiveAssetUsageService::getName(), $usages);
    }

    public function testAssetsDetectKeepsRegistryEmptyWhenNoManifest(): void
    {
        $tmpProjectDir = sys_get_temp_dir().'/symfony-loader-no-manifest-'.uniqid();

        [$service, $assetsRegistryService] = $this->createAssetsServiceForProjectDir($tmpProjectDir);

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($tmpProjectDir)
        );
        $renderPass->usagesConfig[ResponsiveAssetUsageService::getName()]['list'] = [];

        $renderNode = $this->createRenderNode('bundle/view');

        $service->assetsDetect($renderPass, $renderNode);

        $this->assertSame(AssetsService::ASSETS_DEFAULT_EMPTY, $renderNode->assets);
        $this->assertSame([], $assetsRegistryService->getRegistry());
    }

    public function testBuildTagsCreatesAssetTagsAndPlaceholders(): void
    {
        [$service, $assetsRegistryService] = $this->createAssetsServiceForProjectDir($this->getFixtureProjectDir());

        $assetsRegistryService->addAsset(new Asset(
            'build/bundle/css/view.css',
            DefaultAssetUsageService::getName(),
            Asset::CONTEXT_LAYOUT
        ));
        $assetsRegistryService->addAsset(new Asset(
            'build/bundle/js/runtime.js',
            DefaultAssetUsageService::getName(),
            Asset::CONTEXT_PAGE
        ));

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($this->getFixtureProjectDir())
        );
        $renderPass->enableAggregation = false;
        $renderPass->usagesConfig[DefaultAssetUsageService::getName()]['list'] = [];

        $tags = $service->buildTags($renderPass);

        $this->assertArrayHasKey(Asset::EXTENSION_CSS, $tags);
        $this->assertArrayHasKey(Asset::CONTEXT_LAYOUT, $tags[Asset::EXTENSION_CSS]);
        $this->assertNotEmpty($tags[Asset::EXTENSION_JS]['runtime']['extra']);

        $defaultTags = $tags[Asset::EXTENSION_CSS][Asset::CONTEXT_LAYOUT][DefaultAssetUsageService::getName()];
        $this->assertSame('build/bundle/css/view.css', $defaultTags[0]->getPath());
    }

    public function testAssetsDetectWithExplicitViewRegistersAsset(): void
    {
        [$service] = $this->createAssetsServiceForProjectDir($this->getFixtureProjectDir());

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($this->getFixtureProjectDir())
        );
        $renderPass->usagesConfig[ResponsiveAssetUsageService::getName()]['list'] = [];

        $renderNode = $this->createRenderNode('bundle/view');

        $service->assetsDetect($renderPass, $renderNode, 'bundle/view');

        $cssAssets = $renderNode->assets[Asset::EXTENSION_CSS] ?? [];
        $paths = array_map(static fn (Asset $asset) => $asset->path, $cssAssets);

        $this->assertNotEmpty($paths);
        $this->assertContains('build/bundle/css/view.css', $paths);
    }

    public function testBuildTagsAggregatesWhenEnabled(): void
    {
        $aggregation = $this->createMock(AssetsAggregationService::class);
        $aggregation->expects($this->once())->method('buildAggregatedTags')->willReturn([]);

        [$service, $assetsRegistryService] = $this->createAssetsServiceForProjectDir(
            $this->getFixtureProjectDir(),
            assetsAggregationService: $aggregation
        );

        $assetsRegistryService->addAsset(new Asset(
            'build/bundle/css/view.css',
            DefaultAssetUsageService::getName(),
            Asset::CONTEXT_LAYOUT
        ));
        $assetsRegistryService->addAsset(new Asset(
            'build/bundle/js/runtime.js',
            DefaultAssetUsageService::getName(),
            Asset::CONTEXT_PAGE
        ));

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($this->getFixtureProjectDir())
        );
        $renderPass->enableAggregation = true;

        $service->buildTags($renderPass);
    }

    public function testAssetsDetectLoadsAssetsForAllUsages(): void
    {
        [$service] = $this->createAssetsServiceForProjectDir($this->getFixtureProjectDir());

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($this->getFixtureProjectDir())
        );

        $renderPass->usagesConfig = [
            ColorSchemeAssetUsageService::getName() => ['list' => ['dark' => []]],
            ResponsiveAssetUsageService::getName() => [
                'default' => 'm',
                'list' => ['m' => ['breakpoint' => 768, 'allow_switch' => false]],
            ],
            MarginsAssetUsageService::getName() => ['list' => ['default' => []]],
            AnimationsAssetUsageService::getName() => ['list' => ['none' => []]],
            FontsAssetUsageService::getName() => ['list' => ['none' => []]],
        ];

        $renderNode = $this->createRenderNode('bundle/view');

        $service->assetsDetect($renderPass, $renderNode);

        $cssAssets = $renderNode->assets[Asset::EXTENSION_CSS] ?? [];
        $paths = array_map(static fn (Asset $asset) => $asset->path, $cssAssets);

        $this->assertContains('build/bundle/css/view.css', $paths);
        $this->assertContains('build/bundle/css/view.color-scheme.dark.css', $paths);
        $this->assertContains('build/bundle/css/view-m.css', $paths);
        $this->assertContains('build/bundle/css/view.margins.default.css', $paths);
        $this->assertContains('build/bundle/css/view.animations.none.css', $paths);
        $this->assertContains('build/bundle/css/view.fonts.none.css', $paths);
    }

    public function testDefaultAssetNeedsInitialRenderFollowsUseJsFlag(): void
    {
        $assetsRegistryService = $this->createAssetsRegistryServiceForProjectDir($this->getFixtureProjectDir());
        $defaultUsage = new DefaultAssetUsageService($assetsRegistryService);

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($this->getFixtureProjectDir())
        );

        $asset = new Asset(
            'build/bundle/js/test.js',
            $defaultUsage::getName(),
            Asset::CONTEXT_PAGE
        );

        $renderPass->setUseJs(false);
        $this->assertFalse($defaultUsage->assetNeedsInitialRender($asset, $renderPass));

        $renderPass->setUseJs(true);
        $this->assertTrue($defaultUsage->assetNeedsInitialRender($asset, $renderPass));
    }

    public function testResponsiveAssetNeedsInitialRenderWhenJsDisabled(): void
    {
        $assetsRegistryService = $this->createAssetsRegistryServiceForProjectDir($this->getFixtureProjectDir());
        $responsiveUsage = new ResponsiveAssetUsageService($assetsRegistryService);

        $renderPass = new RenderPass(
            'bundle/view',
            new AssetsRegistry($this->getFixtureProjectDir())
        );

        $asset = new Asset(
            'build/bundle/css/test.css',
            $responsiveUsage::getName(),
            Asset::CONTEXT_PAGE
        );
        $asset->usages[$responsiveUsage::getName()] = 'm';

        $renderPass->setUseJs(true);
        $this->assertFalse($responsiveUsage->assetNeedsInitialRender($asset, $renderPass));

        $renderPass->setUseJs(false);
        $this->assertTrue($responsiveUsage->assetNeedsInitialRender($asset, $renderPass));
    }

    private function createRenderNode(string $view): AbstractRenderNode
    {
        $renderNode = new class () extends AbstractRenderNode {
            public function getContextType(): string
            {
                return Asset::CONTEXT_PAGE;
            }
        };

        $renderNode->setDefaultView($view);

        return $renderNode;
    }

    /**
     * @return array{0: AssetsService, 1: AssetsRegistryService}
     */
    private function createAssetsServiceForProjectDir(
        string $projectDir,
        ?AssetsAggregationService $assetsAggregationService = null,
    ): array {
        $assetsRegistryService = $this->createAssetsRegistryServiceForProjectDir($projectDir);

        $assetsAggregationService ??= $this->createStub(AssetsAggregationService::class);

        $kernel = $this->createStub(KernelInterface::class);

        return [
            new AssetsService(
                new AnimationsAssetUsageService($assetsRegistryService),
                new ColorSchemeAssetUsageService($assetsRegistryService),
                new DefaultAssetUsageService($assetsRegistryService),
                new MarginsAssetUsageService($assetsRegistryService),
                new ResponsiveAssetUsageService($assetsRegistryService),
                new FontsAssetUsageService($assetsRegistryService),
                $kernel,
                $assetsAggregationService,
                $assetsRegistryService,
            ),
            $assetsRegistryService,
        ];
    }

    private function createAssetsRegistryServiceForProjectDir(string $projectDir): AssetsRegistryService
    {
        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn(rtrim($projectDir, '/'));

        return new AssetsRegistryService($kernel);
    }

    private function getFixtureProjectDir(): string
    {
        return __DIR__.'/../../Fixtures/App';
    }
}
