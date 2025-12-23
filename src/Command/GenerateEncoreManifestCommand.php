<?php

namespace Wexample\SymfonyLoader\Command;

use RuntimeException;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyLoader\Service\Encore\EncoreManifestBuilder;
use Wexample\SymfonyLoader\Service\Encore\TsconfigPathsSynchronizer;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyHelpers\Command\AbstractBundleCommand;
use Wexample\SymfonyHelpers\Helper\JsonHelper;
use Wexample\SymfonyHelpers\Service\BundleService;

class GenerateEncoreManifestCommand extends AbstractBundleCommand
{
    use SymfonyLoaderBundleClassTrait;

    private const OPTION_OUTPUT = 'output';
    private const OPTION_PRETTY = 'pretty';
    private const OPTION_SYNC_TSCONFIG = 'sync-tsconfig';
    private const OPTION_TSCONFIG = 'tsconfig';
    private const DEFAULT_FILENAME = 'assets/encore.manifest.json';
    private const DEFAULT_TSCONFIG = 'tsconfig.json';

    public function __construct(
        BundleService $bundleService,
        private readonly EncoreManifestBuilder $manifestBuilder,
        private readonly TsconfigPathsSynchronizer $tsconfigPathsSynchronizer,
        private readonly KernelInterface $kernel,
        private readonly Filesystem $filesystem,
        string $name = null,
    ) {
        parent::__construct(
            $bundleService,
            $name
        );
    }

    protected function configure(): void
    {
        parent::configure();

        $this
            ->setDescription('Build the Encore manifest that lists every discoverable front asset.')
            ->addOption(
                self::OPTION_OUTPUT,
                'o',
                InputOption::VALUE_OPTIONAL,
                'Path (relative to the project directory) where the manifest should be written',
                self::DEFAULT_FILENAME
            )
            ->addOption(
                self::OPTION_PRETTY,
                null,
                InputOption::VALUE_NEGATABLE,
                'Pretty print the generated JSON manifest',
                true
            )
            ->addOption(
                self::OPTION_SYNC_TSCONFIG,
                null,
                InputOption::VALUE_NEGATABLE,
                'Synchronize tsconfig paths after manifest generation',
                true
            )
            ->addOption(
                self::OPTION_TSCONFIG,
                null,
                InputOption::VALUE_OPTIONAL,
                'Path to the tsconfig file to synchronize (relative to project root)',
                self::DEFAULT_TSCONFIG
            );
    }

    protected function execute(
        InputInterface $input,
        OutputInterface $output
    ): int {
        return $this->executeAndCatchErrors(
            $input,
            $output,
            function (
                InputInterface $input,
                OutputInterface $output,
                SymfonyStyle $io
            ): int {
                $manifest = $this->manifestBuilder->build();

                $targetPath = $this->resolveOutputPath(
                    (string) $input->getOption(self::OPTION_OUTPUT)
                );
                $this->filesystem->mkdir(\dirname($targetPath));

                $flags = $input->getOption(self::OPTION_PRETTY)
                    ? JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
                    : 0;

                if (!JsonHelper::write(
                    $targetPath,
                    $manifest,
                    $flags
                )) {
                    throw new RuntimeException(sprintf('Unable to write Encore manifest to %s', $targetPath));
                }

                $tsconfigMessage = null;
                if ($input->getOption(self::OPTION_SYNC_TSCONFIG) !== false) {
                    $tsconfigPath = $input->getOption(self::OPTION_TSCONFIG);
                    $this->tsconfigPathsSynchronizer->sync(
                        $tsconfigPath ? (string) $tsconfigPath : null,
                        $targetPath
                    );
                    $tsconfigMessage = sprintf(' tsconfig synced (%s)', $this->formatDisplayPath(
                        $this->resolveOutputPath($tsconfigPath ?: self::DEFAULT_TSCONFIG)
                    ));
                }

                $io->success(sprintf(
                    'Encore manifest written to %s (%d front%s, version %s)%s',
                    $this->formatDisplayPath($targetPath),
                    $manifest['frontCount'] ?? count($manifest['fronts']),
                    (($manifest['frontCount'] ?? 0) === 1 ? '' : 's'),
                    $manifest['version'] ?? '?',
                    $tsconfigMessage ? PHP_EOL.$tsconfigMessage : ''
                ));

                return Command::SUCCESS;
            }
        );
    }

    private function resolveOutputPath(?string $option): string
    {
        $filename = $option ?: self::DEFAULT_FILENAME;

        if ($this->isAbsolutePath($filename)) {
            return $filename;
        }

        return rtrim($this->kernel->getProjectDir(), DIRECTORY_SEPARATOR)
            .DIRECTORY_SEPARATOR
            .ltrim($filename, DIRECTORY_SEPARATOR.'./');
    }

    private function formatDisplayPath(string $absolutePath): string
    {
        $projectDir = rtrim($this->kernel->getProjectDir(), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;

        if (str_starts_with($absolutePath, $projectDir)) {
            return './'.ltrim(substr($absolutePath, strlen($projectDir)), DIRECTORY_SEPARATOR);
        }

        return $absolutePath;
    }

    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, DIRECTORY_SEPARATOR)
            || str_starts_with($path, '\\\\')
            || (bool) preg_match('#^[a-zA-Z]:\\\\#', $path);
    }
}
