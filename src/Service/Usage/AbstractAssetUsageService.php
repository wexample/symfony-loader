<?php

namespace Wexample\SymfonyLoader\Service\Usage;

use Wexample\Helpers\Helper\PathHelper;
use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyLoader\Exception\AssetsNotBuiltException;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;

abstract class AbstractAssetUsageService
{
    public function __construct(
        protected AssetsRegistryService $assetsRegistryService
    ) {

    }

    abstract public static function getName(): string;

    public function buildPublicAssetPathFromView(
        string $view,
        string $ext,
        ?string $directory = null
    ): string {
        $nameParts = explode('/', $view);
        $bundle = array_shift($nameParts);

        return AssetsRegistryService::DIR_BUILD
            . PathHelper::join(array_merge([$bundle, $directory ?? $ext], $nameParts))
            . '.' . $ext;
    }

    /**
     * Whether each value of the axis is looked for on its own down the views
     * a node inherits (`$found` the values already given by a closer view):
     * an app shipping its own `palette.default` overrides that value alone,
     * and still wears the design system's `palette.win95`. False for an axis
     * whose files come as a whole set from one view.
     */
    public function inheritsPerValue(): bool
    {
        return true;
    }

    public function addAssetsForRenderNodeAndType(
        RenderPass $renderPass,
        AbstractRenderNode $renderNode,
        string $ext,
        string $view,
        ?string $directory = null,
        ?array &$found = null
    ): bool {
        $pathInfo = pathinfo(
            $this->buildPublicAssetPathFromView(
                $view,
                $ext,
                $directory
            )
        );

        $usage = $this->getName();
        $usageKebab = TextHelper::toKebab($usage);
        $hasAsset = false;

        if (isset($renderPass->usagesConfig[$usage]['list'])) {
            foreach ($renderPass->usagesConfig[$usage]['list'] as $usageValue => $config) {
                // A closer view gave this value already: it is that view's.
                if (null !== $found && isset($found[$usageValue])) {
                    continue;
                }

                $assetPath = $pathInfo['dirname'].'/'.$pathInfo['filename'].'.'.$usageKebab.'.'.$usageValue.'.'.$pathInfo['extension'];

                if ($asset = $this->createAssetIfExists(
                    $assetPath,
                    $renderNode
                )) {
                    $hasAsset = true;
                    $asset->usages[$usage] = $usageValue;

                    if (null !== $found) {
                        $found[$usageValue] = true;
                    }
                }
            }
        }

        return $hasAsset;
    }

    /**
     * @throws AssetsNotBuiltException
     */
    protected function createAssetIfExists(
        string $pathInManifest,
        AbstractRenderNode $renderNode,
    ): ?Asset {
        if (! $this->assetsRegistryService->assetExists($pathInManifest)) {
            return null;
        }

        $realPath = $this->assetsRegistryService->getRealPath($pathInManifest);

        if (! $realPath) {
            // Listed in the manifest and absent from disk: a build that is not
            // finished, which is the same state for whoever is looking at the
            // page as one that never ran. A watcher sharing its output makes it
            // ordinary -- webpack writes the manifest and the files in an order
            // that leaves a window, and emptying the directory first widens it.
            // Typed so that AdaptiveRendererService shows its page instead of a
            // 500 saying nothing anyone can act on.
            throw new AssetsNotBuiltException(
                'Frontend assets need to be built: "'.$pathInManifest
                .'" is in the manifest but not on disk yet.'
            );
        }

        $asset = new Asset(
            $pathInManifest,
            // Resolved public URL (hashed in prod). The client loads assets
            // dynamically without Twig asset(), so it needs the built path.
            $this->assetsRegistryService->getBuiltPath($pathInManifest),
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

}
