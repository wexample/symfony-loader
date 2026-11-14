<?php

namespace Wexample\SymfonyLoader\Rendering;

use JsonSerializable;
use RuntimeException;

/**
 * @deprecated Nothing in the loader reads a render pass's own registry any
 * more: AssetsRegistryService holds the manifest, read once per process. Kept
 * because RenderPass still carries one; its manifest is only read when asked.
 */
class AssetsRegistry implements JsonSerializable
{
    public const DIR_PUBLIC = 'public/';
    public const DIR_BUILD = 'build/';
    public const FILE_MANIFEST = 'manifest.json';

    /**
     * Null until something asks for it: a render pass is given a registry
     * every time, and reading the manifest for one nobody consults was a
     * file read and a json decode for each page.
     */
    private ?array $manifest = null;

    protected array $registry = [];

    private string $pathPublic;

    public function __construct(
        string $projectDir
    ) {
        $this->pathPublic = rtrim($projectDir, '/') . '/' . self::DIR_PUBLIC;
    }

    protected function loadManifest(): void
    {
        $manifestPath = $this->pathPublic . self::DIR_BUILD . self::FILE_MANIFEST;

        if (! is_file($manifestPath)) {
            $this->manifest = [];

            return;
        }

        $content = file_get_contents($manifestPath);

        if ($content === false) {
            throw new RuntimeException(sprintf('Unable to read assets manifest "%s".', $manifestPath));
        }

        $data = json_decode($content, true);

        if (! is_array($data)) {
            throw new RuntimeException(sprintf('Invalid JSON manifest "%s".', $manifestPath));
        }

        $this->manifest = $data;
    }

    private function manifest(): array
    {
        if ($this->manifest === null) {
            $this->loadManifest();
        }

        return $this->manifest ?? [];
    }

    public function assetExists(string $pathInManifest): bool
    {
        return isset($this->manifest()[$pathInManifest]);
    }

    public function getBuiltPath(string $pathInManifest): ?string
    {
        return $this->manifest()[$pathInManifest] ?? null;
    }

    public function getRealPath(string $pathInManifest): ?string
    {
        $builtPath = $this->getBuiltPath($pathInManifest);

        if (! $builtPath) {
            return null;
        }

        return realpath($this->pathPublic . $builtPath) ?: null;
    }

    public function addAsset(Asset $asset): void
    {
        $type = $asset->getType();
        $this->registry[$type] = $this->registry[$type] ?? [];
        $key = $asset->getPath();

        if (isset($this->registry[$type][$key])) {
            throw new RuntimeException(sprintf(
                'Duplicate asset path "%s" for type "%s".',
                $key,
                $type
            ));
        }

        $this->registry[$type][$key] = $asset;
    }

    public function toArray(): array
    {
        $output = [];
        foreach ($this->registry as $type => $assets) {
            $output[$type] = [];
            /** @var Asset $asset */
            foreach ($assets as $id => $asset) {
                $output[$type][$id] = $asset->toArray();
            }
        }

        return $output;
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    public function getRegistry(): array
    {
        return $this->registry;
    }

    public function getManifest(): array
    {
        return $this->manifest();
    }
}
