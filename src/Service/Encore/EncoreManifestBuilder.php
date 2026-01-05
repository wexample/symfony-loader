<?php

namespace Wexample\SymfonyLoader\Service\Encore;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyDev\Service\JsDevPackagesResolver;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

class EncoreManifestBuilder
{
    private const MANIFEST_VERSION = 1;
    private const CSS_EXTENSIONS = ['scss', 'css'];
    private const JS_EXTENSIONS = ['js', 'ts'];
    private const VUE_EXTENSIONS = ['vue'];
    private const EXTENSION_TYPE_MAP = [
        'css' => 'css',
        'scss' => 'css',
        'js' => 'js',
        'ts' => 'js',
        'vue' => 'js',
    ];
    private const JS_MAIN_ALLOWED_DIRECTORIES = ['layouts'];

    private readonly string $projectDir;
    private readonly string $projectDirWithSeparator;
    private ?array $vendorSymlinkCache = null;

    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly ParameterBagInterface $parameterBag,
        private readonly ?JsDevPackagesResolver $jsDevPackagesResolver = null,
    ) {
        $this->projectDir = $this->kernel->getProjectDir();
        $this->projectDirWithSeparator = rtrim($this->projectDir, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
    }

    public function build(): array
    {
        $fronts = [];
        $aliases = [];
        $entries = [
            'css' => [],
            'js' => [
                'main' => [],
                'pages' => [],
                'config' => [],
                'components' => [],
                'forms' => [],
                'vue' => [],
            ],
        ];

        foreach ($this->getFrontDescriptors() as $descriptor) {
            $frontManifest = $this->buildFrontManifest($descriptor);
            $fronts[] = $frontManifest;

            if (null !== $descriptor['alias']) {
                $aliases[$descriptor['alias']] = $frontManifest['paths']['relative'];
            }

            $this->mergeEntries($entries, $frontManifest['assets']);
        }

        // Add JS dev packages aliases (from symfony-dev config)
        $jsDevAliases = $this->getJsDevPackagesAliases();

        return [
            'version' => self::MANIFEST_VERSION,
            'generatedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'projectDir' => $this->projectDir,
            'frontCount' => count($fronts),
            'aliases' => $aliases,
            'jsDevAliases' => $jsDevAliases,
            'fronts' => $fronts,
            'entries' => $entries,
        ];
    }

    /**
     * @return array<string, mixed>[]
     */
    private function getFrontDescriptors(): array
    {
        $pathsGroups = $this->parameterBag->has('loader_packages_front_paths')
            ? $this->parameterBag->get('loader_packages_front_paths')
            : [];
        $descriptors = [];

        foreach ($pathsGroups as $groupKey => $paths) {
            foreach ($paths as $key => $path) {
                $descriptors[] = $this->buildFrontDescriptor(
                    (string) $groupKey,
                    $key,
                    $path
                );
            }
        }

        return $descriptors;
    }

    /**
     * @param int|string $key
     */
    private function buildFrontDescriptor(
        string $group,
        int|string $key,
        string $path
    ): array {
        $absolutePath = $this->ensureTrailingSeparator(realpath($path) ?: $path);

        return [
            'group' => $group,
            'key' => (string) $key,
            'alias' => is_string($key) ? (string) $key : null,
            'bundle' => $this->buildBundleTag($key),
            'type' => $group === VariableHelper::APP ? 'app' : 'bundle',
            'pathAbsolute' => $absolutePath,
            'pathRelative' => $this->buildProjectRelativePath($absolutePath),
        ];
    }

    private function buildFrontManifest(array $descriptor): array
    {
        $assets = [
            'css' => $this->buildCssEntries($descriptor),
            'js' => [
                'main' => $this->buildMainJsEntries($descriptor),
                'pages' => $this->buildWrappedEntries($descriptor, 'pages', 'pages', true),
                'config' => $this->buildWrappedEntries($descriptor, 'config', 'config', true),
                'components' => $this->buildWrappedEntries($descriptor, 'components', 'components'),
                'forms' => $this->buildWrappedEntries($descriptor, 'forms', 'components'),
                'vue' => $this->buildVueEntries($descriptor),
            ],
        ];

        return [
            'key' => $descriptor['key'],
            'group' => $descriptor['group'],
            'alias' => $descriptor['alias'],
            'bundle' => $descriptor['bundle'],
            'type' => $descriptor['type'],
            'paths' => [
                'absolute' => $descriptor['pathAbsolute'],
                'relative' => $descriptor['pathRelative'],
            ],
            'assets' => $assets,
        ];
    }

    private function buildCssEntries(array $descriptor): array
    {
        $files = $this->scanFiles($descriptor, '', self::CSS_EXTENSIONS);

        return $this->mapEntries(
            $descriptor,
            $files,
            'all'
        );
    }

    private function buildMainJsEntries(array $descriptor): array
    {
        $files = $this->scanFiles(
            $descriptor,
            '',
            self::JS_EXTENSIONS,
            function (string $relative, string $filename): bool {
                $parts = explode('/', $relative);
                $firstSegment = $parts[0] ?? '';

                if (!in_array($firstSegment, self::JS_MAIN_ALLOWED_DIRECTORIES, true)) {
                    return false;
                }

                return !$this->isClassFile($filename);
            }
        );

        return $this->mapEntries(
            $descriptor,
            $files,
            'main',
            // Bundle entries need wrappers to register classes (appRegistry).
            $descriptor['type'] === 'bundle',
            'main'
        );
    }

    private function buildWrappedEntries(
        array $descriptor,
        string $subDirectory,
        string $wrapperType,
        bool $excludeClasses = false
    ): array {
        $files = $this->scanFiles(
            $descriptor,
            $subDirectory,
            self::JS_EXTENSIONS,
            function (string $relative, string $filename) use ($excludeClasses): bool {
                return !$excludeClasses || !$this->isClassFile($filename);
            }
        );

        return $this->mapEntries(
            $descriptor,
            $files,
            $subDirectory,
            true,
            $wrapperType
        );
    }

    private function buildVueEntries(array $descriptor): array
    {
        $files = $this->scanFiles(
            $descriptor,
            '',
            self::VUE_EXTENSIONS
        );

        return $this->mapEntries(
            $descriptor,
            $files,
            'vue',
            true,
            'vue'
        );
    }

    private function mapEntries(
        array $descriptor,
        array $files,
        string $category,
        bool $withWrapper = false,
        ?string $wrapperType = null
    ): array {
        $entries = [];

        foreach ($files as $file) {
            $entries[] = $this->createEntry(
                $descriptor,
                $file,
                $category,
                $withWrapper,
                $wrapperType
            );
        }

        return $entries;
    }

    private function createEntry(
        array $descriptor,
        array $file,
        string $category,
        bool $withWrapper,
        ?string $wrapperType
    ): array {
        $type = self::EXTENSION_TYPE_MAP[$file['extension']] ?? $file['extension'];
        $pathWithoutExt = $this->removeExtension($file['relativeFront']);

        $entry = [
            'bundle' => $descriptor['bundle'],
            'frontKey' => $descriptor['key'],
            'type' => $type,
            'category' => $category,
            'extension' => $file['extension'],
            'relative' => $file['relativeFront'],
            'source' => $file['relativeProject'],
            'output' => $this->buildOutputName($descriptor['bundle'], $type, $pathWithoutExt),
        ];

        if ($withWrapper) {
            $entry['wrapper'] = [
                'type' => $wrapperType,
                'className' => $this->buildClassName($descriptor['bundle'], $pathWithoutExt),
            ];
        }

        return $entry;
    }

    private function buildOutputName(
        string $bundle,
        string $type,
        string $pathWithoutExtension
    ): string {
        return rtrim($bundle, '/')
            .'/'.$type.'/'
            .$this->normalizePath($pathWithoutExtension);
    }

    private function buildClassName(
        string $bundle,
        string $pathWithoutExtension
    ): string {
        return rtrim($bundle, '/')
            .'/'.$this->normalizePath($pathWithoutExtension);
    }

    private function scanFiles(
        array $descriptor,
        string $subDirectory,
        array $extensions,
        ?callable $filter = null
    ): array {
        $directory = $this->buildTargetDirectory($descriptor['pathAbsolute'], $subDirectory);

        if (!is_dir($directory)) {
            return [];
        }

        $files = [];
        $directoryIterator = new RecursiveDirectoryIterator(
            $directory,
            RecursiveDirectoryIterator::SKIP_DOTS | RecursiveDirectoryIterator::FOLLOW_SYMLINKS
        );
        $iterator = new RecursiveIteratorIterator($directoryIterator);

        foreach ($iterator as $item) {
            if (!$item->isFile()) {
                continue;
            }

            $extension = strtolower($item->getExtension());
            if (!in_array($extension, $extensions, true)) {
                continue;
            }

            $filename = $item->getFilename();
            if ($this->shouldIgnoreFile($filename)) {
                continue;
            }

            $relativeFront = $this->normalizePath(
                ltrim(substr($item->getPathname(), strlen($descriptor['pathAbsolute'])), DIRECTORY_SEPARATOR)
            );

            if ($filter && !$filter($relativeFront, $filename)) {
                continue;
            }

            $files[] = [
                'absolute' => $item->getPathname(),
                'relativeFront' => $relativeFront,
                'relativeProject' => $this->buildProjectRelativePath($item->getPathname()),
                'extension' => $extension,
                'filename' => $filename,
            ];
        }

        usort(
            $files,
            static fn ($a, $b) => $a['relativeFront'] <=> $b['relativeFront']
        );

        return $files;
    }

    private function buildTargetDirectory(
        string $base,
        string $subDirectory
    ): string {
        $normalizedBase = $this->ensureTrailingSeparator($base);
        $trimmed = trim($subDirectory, DIRECTORY_SEPARATOR);

        if ('' === $trimmed) {
            return $normalizedBase;
        }

        return $normalizedBase.$trimmed.DIRECTORY_SEPARATOR;
    }

    private function shouldIgnoreFile(string $filename): bool
    {
        return '' !== $filename && $filename[0] === '_';
    }

    private function isClassFile(string $filename): bool
    {
        return '' !== $filename && strtoupper($filename[0]) === $filename[0];
    }

    private function removeExtension(string $path): string
    {
        $position = strrpos($path, '.');

        return false === $position ? $path : substr($path, 0, $position);
    }

    private function normalizePath(string $path): string
    {
        return str_replace('\\', '/', ltrim($path, '/'));
    }

    private function ensureTrailingSeparator(string $path): string
    {
        return rtrim($path, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
    }

    /**
     * @param int|string $key
     */
    private function buildBundleTag(int|string $key): string
    {
        if (!is_string($key) || is_numeric($key)) {
            return '@front';
        }

        $alias = ltrim($key, '@');
        $alias = str_replace('/', '-', $alias);

        return '@'.TextHelper::toClass($alias).'Bundle';
    }

    private function mergeEntries(array &$target, array $assets): void
    {
        foreach ($assets['css'] as $cssEntry) {
            $target['css'][] = $cssEntry;
        }

        foreach ($assets['js'] as $category => $entries) {
            if (!isset($target['js'][$category])) {
                $target['js'][$category] = [];
            }

            foreach ($entries as $entry) {
                $target['js'][$category][] = $entry;
            }
        }
    }

    private function buildProjectRelativePath(string $absolutePath): string
    {
        $normalizedAbsolute = $this->ensureTrailingSeparatorIfDirectory($absolutePath);

        if (str_starts_with($normalizedAbsolute, $this->projectDirWithSeparator)) {
            return './'.$this->normalizePath(substr($normalizedAbsolute, strlen($this->projectDirWithSeparator)));
        }

        foreach ($this->getVendorSymlinkCache() as $target => $relative) {
            if (str_starts_with($normalizedAbsolute, $target)) {
                return $relative.$this->normalizePath(substr($normalizedAbsolute, strlen($target)));
            }
        }

        return $normalizedAbsolute;
    }

    private function ensureTrailingSeparatorIfDirectory(string $path): string
    {
        if (is_dir($path) && !str_ends_with($path, DIRECTORY_SEPARATOR)) {
            return $path.DIRECTORY_SEPARATOR;
        }

        return $path;
    }

    private function getVendorSymlinkCache(): array
    {
        if (null !== $this->vendorSymlinkCache) {
            return $this->vendorSymlinkCache;
        }

        $cache = [];
        $vendorPath = $this->projectDirWithSeparator.'vendor'.DIRECTORY_SEPARATOR;

        if (!is_dir($vendorPath)) {
            return $this->vendorSymlinkCache = $cache;
        }

        $directoryIterator = new RecursiveDirectoryIterator(
            $vendorPath,
            RecursiveDirectoryIterator::SKIP_DOTS
        );
        $iterator = new RecursiveIteratorIterator($directoryIterator);

        foreach ($iterator as $item) {
            if (!$item->isLink()) {
                continue;
            }

            $target = realpath($item->getPathname());
            if (!$target) {
                continue;
            }

            $cache[$this->ensureTrailingSeparator($target)] = './'.$this->normalizePath(
                substr(
                    $this->ensureTrailingSeparator($item->getPathname()),
                    strlen($this->projectDirWithSeparator)
                )
            );
        }

        return $this->vendorSymlinkCache = $cache;
    }

    /**
     * Get JS dev packages aliases from symfony-dev config.
     * 
     * @return array<string, string> Alias => absolute path
     */
    private function getJsDevPackagesAliases(): array
    {
        if ($this->jsDevPackagesResolver === null) {
            return [];
        }

        $aliases = $this->jsDevPackagesResolver->resolvePackages();

        foreach ($aliases as $alias => $path) {
            $aliases[$alias] = $this->ensureSrcPath($path);
        }

        return $aliases;
    }

    private function ensureSrcPath(string $path): string
    {
        $normalized = rtrim(str_replace('\\', '/', $path), '/');

        if (str_ends_with($normalized, '/src') || str_ends_with($normalized, '/src/*')) {
            return $normalized;
        }

        return $normalized.'/src';
    }
}
