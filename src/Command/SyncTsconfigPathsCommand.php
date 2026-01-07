<?php

namespace Wexample\SymfonyLoader\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Wexample\SymfonyLoader\Service\Encore\TsconfigPathsSynchronizer;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyHelpers\Command\AbstractBundleCommand;
use Wexample\SymfonyHelpers\Service\BundleService;

class SyncTsconfigPathsCommand extends AbstractBundleCommand
{
    use SymfonyLoaderBundleClassTrait;

    private const OPTION_TSCONFIG = 'tsconfig';
    private const OPTION_MANIFEST = 'manifest';
    private const DEFAULT_TSCONFIG = 'tsconfig.json';

    public function __construct(
        BundleService $bundleService,
        private readonly TsconfigPathsSynchronizer $synchronizer,
        private readonly ParameterBagInterface $parameterBag,
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
            ->setDescription('Synchronize tsconfig paths with Encore manifest aliases.')
            ->addOption(
                self::OPTION_TSCONFIG,
                null,
                InputOption::VALUE_OPTIONAL,
                'Path to tsconfig file (relative to project root)',
                null
            )
            ->addOption(
                self::OPTION_MANIFEST,
                null,
                InputOption::VALUE_OPTIONAL,
                'Path to Encore manifest (relative to project root)',
                'assets/encore.manifest.json'
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
                $tsconfigPath = $input->getOption(self::OPTION_TSCONFIG);
                $manifestPath = $input->getOption(self::OPTION_MANIFEST);

                $this->synchronizer->sync(
                    $this->resolveTsconfigPath($tsconfigPath),
                    $manifestPath ? (string) $manifestPath : null
                );

                $io->success('tsconfig paths updated from Encore manifest.');

                return Command::SUCCESS;
            }
        );
    }

    private function resolveTsconfigPath(mixed $optionValue): string
    {
        if (is_string($optionValue) && $optionValue !== '') {
            return $optionValue;
        }

        if ($this->parameterBag->has('wexample_symfony_loader.tsconfig_path')) {
            $configured = $this->parameterBag->get('wexample_symfony_loader.tsconfig_path');
            if (is_string($configured) && $configured !== '') {
                return $configured;
            }
        }

        return self::DEFAULT_TSCONFIG;
    }
}
