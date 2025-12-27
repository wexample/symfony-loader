<?php

namespace Wexample\SymfonyLoader\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\Filesystem\Path;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyLoader\Helper\LoaderHelper;
use Wexample\Helpers\Helper\PathHelper;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyHelpers\Command\AbstractBundleCommand;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyHelpers\Helper\JsonHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyHelpers\Service\BundleService;

class GetFrontsCommand extends AbstractBundleCommand
{
    use SymfonyLoaderBundleClassTrait;

    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly ParameterBagInterface $parameterBag,
        BundleService $bundleService,
        string $name = null,
    ) {
        parent::__construct(
            $bundleService,
            $name
        );
    }

    public static function getBundleClassName(): string
    {
        return WexampleSymfonyLoaderBundle::class;
    }

    protected function execute(
        InputInterface $input,
        OutputInterface $output
    ): int {
        $io = new SymfonyStyle($input, $output);

        if ($this->buildFrontsPathsList()) {
            $io->success(
                'Created fronts folders list in '
                .$this->getFrontsListPath()
            );

            return Command::SUCCESS;
        }

        $io->error('Unexpected error');

        return Command::FAILURE;
    }

    private function buildFrontsPathsList(): bool
    {
        return JsonHelper::write(
            $this->getFrontsListPath(),
            $this->getFrontPaths(),
            JSON_PRETTY_PRINT
        );
    }

    private function getFrontsListPath(): string
    {
        return PathHelper::join([
            $this->kernel->getProjectDir(),
            VariableHelper::ASSETS,
            LoaderHelper::TWIG_NAMESPACE_FRONT
            .FileHelper::EXTENSION_SEPARATOR
            .VariableHelper::JSON,
        ]);
    }

    private function getFrontPaths(): array
    {
        $pathsGroups = (array) $this->parameterBag->get('loader_packages_front_paths');

        $projectRoot = rtrim($this->kernel->getProjectDir(), "/\\");
        $vendorLink  = $projectRoot . DIRECTORY_SEPARATOR . 'vendor';

        // Real path of the vendor directory (follows symlinks).
        // Example: /var/www/html/vendor (symlink) -> /var/www/vendor-dev (real)
        $vendorReal = is_dir($vendorLink) ? realpath($vendorLink) : false;

        $paths = [];

        foreach ($pathsGroups as $group) {
            foreach ($group as $key => $path) {
                $path = (string) $path;

                // Normalize separators for prefix checks.
                $normPath      = str_replace('\\', '/', $path);
                $normProject   = str_replace('\\', '/', $projectRoot);
                $normVendorLink = str_replace('\\', '/', $vendorLink);
                $normVendorReal = $vendorReal ? str_replace('\\', '/', $vendorReal) : null;

                $relative = null;

                // 1) If the path is inside the real vendor target, force it back to "./vendor/...".
                if ($normVendorReal && strncmp($normPath, $normVendorReal . '/', strlen($normVendorReal) + 1) === 0) {
                    $sub = ltrim(substr($normPath, strlen($normVendorReal)), '/');
                    $relative = 'vendor/' . $sub;
                }
                // 2) If the path is already inside the vendor symlink, also keep it as "./vendor/...".
                elseif (strncmp($normPath, $normVendorLink . '/', strlen($normVendorLink) + 1) === 0) {
                    $sub = ltrim(substr($normPath, strlen($normVendorLink)), '/');
                    $relative = 'vendor/' . $sub;
                }
                // 3) If the path is inside the project root, make it relative to the project root.
                elseif (strncmp($normPath, $normProject . '/', strlen($normProject) + 1) === 0) {
                    $sub = ltrim(substr($normPath, strlen($normProject)), '/');
                    $relative = $sub;
                }
                // 4) Fallback: assume it is already a relative path.
                else {
                    $relative = ltrim($normPath, '/');
                }

                // Ensure "./" prefix and trailing slash.
                $relative = rtrim($relative, '/') . '/';
                $paths[$key] = './' . $relative;
            }
        }

        return $paths;
    }
}
