<?php

namespace Wexample\SymfonyLoader\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Wexample\SymfonyHelpers\Command\AbstractBundleCommand;
use Wexample\SymfonyHelpers\Service\BundleService;
use Wexample\SymfonyLoader\Service\RequirementsService;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;

/**
 * Lists what the bundles need and whether the application gives it; fails
 * when something is missing. Run at the start of a production container,
 * before it takes requests.
 */
class RequirementsCommand extends AbstractBundleCommand
{
    use SymfonyLoaderBundleClassTrait;

    public function __construct(
        BundleService $bundleService,
        private readonly RequirementsService $requirements,
        ?string $name = null,
    ) {
        parent::__construct(
            $bundleService,
            $name
        );
    }

    protected function configure(): void
    {
        parent::configure();

        $this->setDescription('Check that the application gives what its bundles need.');
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
                $requirements = $this->requirements->getRequirements();

                if ($requirements) {
                    $io->table(['', 'Requirement', 'How to give it'], array_map(
                        static fn ($requirement) => [$requirement->met ? 'ok' : 'MISSING', $requirement->name, $requirement->hint],
                        $requirements
                    ));
                }

                if ($this->requirements->findMissing()) {
                    $io->error('Some requirements are missing.');

                    return Command::FAILURE;
                }

                $io->success(count($requirements).' requirement(s), all met.');

                return Command::SUCCESS;
            }
        );
    }
}
