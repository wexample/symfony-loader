<?php

namespace Wexample\SymfonyLoader\Service\Encore;

use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyHelpers\Helper\JsonHelper;

class TsconfigPathsSynchronizer
{
    public function __construct(
        private readonly KernelInterface $kernel,
    ) {
    }

    public function sync(
        ?string $tsconfigPath = null,
        ?string $manifestPath = null
    ): void {
        $projectDir = $this->kernel->getProjectDir();
        $tsconfigPath = $this->resolvePath($projectDir, $tsconfigPath ?: 'tsconfig.json');
        $manifestPath = $this->resolvePath($projectDir, $manifestPath ?: 'assets/encore.manifest.json');

        $manifest = JsonHelper::read($manifestPath, true);

        if (!is_array($manifest) || !isset($manifest['aliases'])) {
            throw new \RuntimeException(sprintf('Unable to read aliases from manifest %s.', $manifestPath));
        }

        $tsconfig = JsonHelper::read($tsconfigPath, true) ?? [];
        $compilerOptions = $tsconfig['compilerOptions'] ?? [];
        $paths = $compilerOptions['paths'] ?? [];

        foreach ($manifest['aliases'] as $alias => $relativePath) {
            $paths[$this->normalizeAlias($alias)] = [$this->normalizePath($relativePath)];
        }

        // Add JS dev packages aliases (absolute paths)
        if (isset($manifest['jsDevAliases']) && is_array($manifest['jsDevAliases'])) {
            foreach ($manifest['jsDevAliases'] as $alias => $absolutePath) {
                $paths[$this->normalizeAlias($alias)] = [$this->normalizePath($absolutePath)];
            }
        }

        ksort($paths);

        $compilerOptions['baseUrl'] = $compilerOptions['baseUrl'] ?? '.';
        $compilerOptions['paths'] = $paths;
        $tsconfig['compilerOptions'] = $compilerOptions;

        JsonHelper::write(
            $tsconfigPath,
            $tsconfig,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
        );
    }

    private function resolvePath(string $projectDir, string $path): string
    {
        if (str_starts_with($path, '/')) {
            return $path;
        }

        return $projectDir.DIRECTORY_SEPARATOR.ltrim($path, DIRECTORY_SEPARATOR);
    }

    private function normalizeAlias(string $alias): string
    {
        return str_ends_with($alias, '/*') ? $alias : $alias.'/*';
    }

    private function normalizePath(string $relativePath): string
    {
        $normalized = rtrim($relativePath, '/');

        if (str_ends_with($normalized, '*')) {
            return $normalized;
        }

        return $normalized.'/*';
    }
}
