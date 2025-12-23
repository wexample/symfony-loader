<?php

namespace Wexample\SymfonyDesignSystem\Service\Usage;

use Wexample\SymfonyDesignSystem\Rendering\Asset;
use Wexample\SymfonyDesignSystem\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyHelpers\Helper\FileHelper;

final class ResponsiveAssetUsageService extends AbstractAssetUsageService
{
    public static function getName(): string
    {
        return 'responsive';
    }

    public function addAssetsForRenderNodeAndType(
        RenderPass $renderPass,
        AbstractRenderNode $renderNode,
        string $ext,
        string $view
    ): bool {
        $pathInfo = pathinfo($this->buildPublicAssetPathFromView($view, $ext));
        $maxWidth = null;
        $hasAsset = false;

        $breakpoints = array_reverse($renderPass->getDisplayBreakpoints());
        foreach ($breakpoints as $breakpointName => $minWidth) {
            $responsivePath = $pathInfo['dirname']
                .FileHelper::FOLDER_SEPARATOR
                .$pathInfo['filename']
                .'-'.$breakpointName
                .'.'
                .$pathInfo['extension'];

            if ($asset = $this->createAssetIfExists(
                $responsivePath,
                $view,
                $renderNode
            )) {
                $hasAsset = true;
                $asset->usages[$this->getName()] = $breakpointName;
                $asset->media = 'screen and (min-width:'.$minWidth.'px)'.
                    ($maxWidth ? ' and (max-width:'.$maxWidth.'px)' : '');
            }

            $maxWidth = $minWidth;
        }

        return $hasAsset;
    }

    public function assetNeedsInitialRender(
        Asset $asset,
        RenderPass $renderPass,
    ): bool {
        if ($asset->type === Asset::EXTENSION_CSS) {
            if (isset($asset->usages[$this->getName()])) {
                // Responsive CSS are loaded in page when JS is disabled.
                return ! $renderPass->isUseJs();
            }
        }

        return true;
    }
}
