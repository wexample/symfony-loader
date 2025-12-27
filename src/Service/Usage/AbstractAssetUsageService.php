<?php

namespace Wexample\SymfonyLoader\Service\Usage;

use Exception;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;
use Wexample\Helpers\Helper\PathHelper;
use Wexample\Helpers\Helper\TextHelper;

abstract class AbstractAssetUsageService
{
    public function __construct(
        protected AssetsRegistryService $assetsRegistryService
    ) {

    }

    abstract public static function getName(): string;

    public function buildPublicAssetPathFromView(
        string $view,
        string $ext
    ): string {
        $nameParts = explode('/', $view);
        $bundle = array_shift($nameParts);

        return AssetsRegistryService::DIR_BUILD.PathHelper::join(array_merge([$bundle, $ext], $nameParts)).'.'.$ext;
    }

    public function addAssetsForRenderNodeAndType(
        RenderPass $renderPass,
        AbstractRenderNode $renderNode,
        string $ext,
        string $view
    ): bool {
        $pathInfo = pathinfo(
            $this->buildPublicAssetPathFromView(
                $view,
                $ext
            )
        );

        $usage = $this->getName();
        $usageKebab = TextHelper::toKebab($usage);
        $hasAsset = false;

        if (isset($renderPass->usagesConfig[$usage]['list'])) {
            foreach ($renderPass->usagesConfig[$usage]['list'] as $usageValue => $config) {
                $assetPath = $pathInfo['dirname'].'/'.$pathInfo['filename'].'.'.$usageKebab.'.'.$usageValue.'.'.$pathInfo['extension'];

                if ($asset = $this->createAssetIfExists(
                    $assetPath,
                    $renderNode
                )) {
                    $hasAsset = true;
                    $asset->usages[$usage] = $usageValue;
                }
            }
        }

        return $hasAsset;
    }

    /**
     * @throws Exception
     */
    protected function createAssetIfExists(
        string $pathInManifest,
        AbstractRenderNode $renderNode,
    ): ?Asset {
        if (!$this->assetsRegistryService->assetExists($pathInManifest)) {
            return null;
        }

        $realPath = $this->assetsRegistryService->getRealPath($pathInManifest);

        if (!$realPath) {
            throw new Exception('Unable to find realpath of asset "'
                .$pathInManifest.', check build folder content or files permissions.');
        }

        $asset = new Asset(
            $pathInManifest,
            $this::getName(),
            $renderNode->getContextType()
        );

        $renderNode->assets[$asset->type][] = $asset;

        $this->assetsRegistryService->addAsset(
            $asset,
        );

        return $asset;
    }

    public function assetNeedsInitialRender(
        Asset $asset,
        RenderPass $renderPass,
    ): bool {
        $usage = $this->getName();
        // This is the base usage (i.e. default).
        return $asset->usages[$usage] == $renderPass->getUsage($usage);
    }

    protected function hasExtraSwitchableUsage(RenderPass $renderPass): bool
    {
        $usage = static::getName();
        foreach (($renderPass->usagesConfig[$usage]['list'] ?? []) as $scheme => $config) {
            // There is at least one other switchable usage different from default one.
            if (($config['allow_switch'] ?? false)
                && $scheme !== $renderPass->getUsage($usage)) {
                return true;
            }
        }

        return false;
    }

    public function canAggregateAsset(
        RenderPass $renderPass,
        Asset $asset
    ): bool {
        return (!$this->hasExtraSwitchableUsage($renderPass)) && $asset->isServerSideRendered();
    }
}
