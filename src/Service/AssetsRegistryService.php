<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyDesignSystem\Rendering\Asset;
use Wexample\SymfonyDesignSystem\Rendering\RenderDataGenerator;
use Wexample\SymfonyHelpers\Helper\JsonHelper;

class AssetsRegistryService extends RenderDataGenerator
{
    private array $manifest = [];

    protected array $registry = [];

    private string $pathPublic;

    /**
     * @var string
     */
    private const CACHE_KEY_ASSETS_REGISTRY = 'assets_registry';

    public const DIR_BUILD = 'build/';

    public const DIR_PUBLIC = 'public/';

    public const FILE_MANIFEST = 'manifest.json';

    public function __construct(
        KernelInterface $kernel
    ) {
        $pathProject = $kernel->getProjectDir() . '/';
        $this->pathPublic = $pathProject . self::DIR_PUBLIC;
        $pathBuild = $this->pathPublic . self::DIR_BUILD;

        $this->manifest = JsonHelper::read(
            $pathBuild . self::FILE_MANIFEST,
            JSON_OBJECT_AS_ARRAY,
            default: $this->manifest
        );
    }

    public function assetExists(string $pathInManifest): bool
    {
        return isset($this->manifest[$pathInManifest]);
    }

    public function getBuiltPath(string $pathInManifest): string
    {
        return $this->manifest[$pathInManifest];
    }

    public function getRealPath(string $pathInManifest): string
    {
        return realpath($this->pathPublic . $this->getBuiltPath($pathInManifest));
    }

    public function addAsset(Asset $asset): void
    {
        $this->registry[$asset->type] = $this->registry[$asset->type] ?? [];
        $templateName = $asset->getView();

        if (! isset($this->registry[$asset->type][$templateName])) {
            $this->registry[$asset->type][$templateName] = $asset;
        }
    }

    public function toRenderData(): array
    {
        $output = [];
        foreach ($this->registry as $type => $assets) {
            $output[$type] = [];
            /** @var Asset $asset */
            foreach ($assets as $id => $asset) {
                $output[$type][$id] = $asset->toRenderData();
            }
        }

        return $output;
    }

    public function getRegistry(): array
    {
        return $this->registry;
    }
}
