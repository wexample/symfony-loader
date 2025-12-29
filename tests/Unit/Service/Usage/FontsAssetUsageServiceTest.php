<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service\Usage;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;
use Wexample\SymfonyLoader\Service\Usage\FontsAssetUsageService;

class FontsAssetUsageServiceTest extends TestCase
{
    public function testAssetNeedsInitialRenderMatchesUsage(): void
    {
        $service = new FontsAssetUsageService($this->createStub(AssetsRegistryService::class));

        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));
        $renderPass->usagesConfig = [
            FontsAssetUsageService::getName() => ['list' => []],
        ];
        $renderPass->setUsage(FontsAssetUsageService::getName(), 'default');

        $asset = new Asset('build/bundle/css/view.css', FontsAssetUsageService::getName(), Asset::CONTEXT_LAYOUT);
        $asset->usages[FontsAssetUsageService::getName()] = 'default';

        $this->assertTrue($service->assetNeedsInitialRender($asset, $renderPass));

        $renderPass->setUsage(FontsAssetUsageService::getName(), 'other');
        $this->assertFalse($service->assetNeedsInitialRender($asset, $renderPass));
    }

    public function testCanAggregateAssetDependsOnSwitchableUsage(): void
    {
        $service = new FontsAssetUsageService($this->createStub(AssetsRegistryService::class));

        $renderPass = new RenderPass('view', new AssetsRegistry(sys_get_temp_dir()));
        $renderPass->usagesConfig = [
            FontsAssetUsageService::getName() => [
                'list' => [
                    'default' => ['allow_switch' => false],
                ],
            ],
        ];
        $renderPass->setUsage(FontsAssetUsageService::getName(), 'default');

        $asset = new Asset('build/bundle/css/view.css', FontsAssetUsageService::getName(), Asset::CONTEXT_LAYOUT);
        $asset->usages[FontsAssetUsageService::getName()] = 'default';
        $asset->setServerSideRendered();

        $this->assertTrue($service->canAggregateAsset($renderPass, $asset));

        $renderPass->usagesConfig[FontsAssetUsageService::getName()]['list']['alt'] = ['allow_switch' => true];
        $this->assertFalse($service->canAggregateAsset($renderPass, $asset));
    }

    public function testCreateAssetIfExistsThrowsWhenRealPathMissing(): void
    {
        $assetsRegistryService = $this->createStub(AssetsRegistryService::class);
        $assetsRegistryService->method('assetExists')->willReturn(true);
        $assetsRegistryService->method('getRealPath')->willReturn('');

        $service = new FontsAssetUsageService($assetsRegistryService);

        $renderNode = new class extends AbstractRenderNode {
            public function getContextType(): string
            {
                return Asset::CONTEXT_LAYOUT;
            }
        };

        $this->expectException(\Exception::class);
        $this->invokeCreateAssetIfExists($service, 'build/bundle/css/view.css', $renderNode);
    }

    private function invokeCreateAssetIfExists(
        FontsAssetUsageService $service,
        string $path,
        AbstractRenderNode $renderNode,
    ): mixed {
        $ref = new \ReflectionMethod($service, 'createAssetIfExists');
        $ref->setAccessible(true);

        return $ref->invoke($service, $path, $renderNode);
    }
}
