<?php

namespace Wexample\SymfonyLoader\Service\Usage;

use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;

final class DefaultAssetUsageService extends AbstractAssetUsageService
{
    public static function getName(): string
    {
        return 'default';
    }

    public function addAssetsForRenderNodeAndType(
        RenderPass $renderPass,
        AbstractRenderNode $renderNode,
        string $ext,
        string $view,
        ?string $directory = null
    ): bool {
        return (bool) $this->createAssetIfExists(
            $this->buildPublicAssetPathFromView(
                $view,
                $ext,
                $directory
            ),
            $renderNode,
        );
    }

    public function assetNeedsInitialRender(
        Asset $asset,
        RenderPass $renderPass,
    ): bool {
        if ($asset->type === Asset::EXTENSION_JS) {
            return $renderPass->isUseJs();
        }

        return true;
    }
}
