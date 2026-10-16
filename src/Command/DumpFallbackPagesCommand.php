<?php

namespace Wexample\SymfonyLoader\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpKernel\KernelInterface;
use Twig\Environment;
use Wexample\SymfonyHelpers\Command\AbstractBundleCommand;
use Wexample\SymfonyHelpers\Service\BundleService;
use Wexample\SymfonyLoader\Helper\FallbackPageHelper;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;

/**
 * Writes the fallback pages out (FallbackPageHelper), each a whole file, for
 * whatever serves the application while Symfony cannot: the server holding
 * the port during a start, the guard catching a kernel that does not boot.
 * Run where the image is built, and again at each start.
 */
class DumpFallbackPagesCommand extends AbstractBundleCommand
{
    use SymfonyLoaderBundleClassTrait;

    private const string OPTION_OUTPUT = 'output';

    public function __construct(
        BundleService $bundleService,
        private readonly Environment $twig,
        private readonly KernelInterface $kernel,
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

        $this
            ->setDescription('Write the pages shown while the application cannot draw its own.')
            ->addOption(
                self::OPTION_OUTPUT,
                null,
                InputOption::VALUE_OPTIONAL,
                'Directory to write them to (relative to the project root)',
                'public/'.FallbackPageHelper::PUBLIC_DIR
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
                $directory = $this->kernel->getProjectDir().'/'.trim((string) $input->getOption(self::OPTION_OUTPUT), '/');

                if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
                    throw new \RuntimeException('Cannot create '.$directory);
                }

                foreach (FallbackPageHelper::pages() as $file => $context) {
                    file_put_contents(
                        $directory.'/'.$file,
                        $this->twig->render(FallbackPageHelper::TEMPLATE, $context)
                    );
                }

                $io->success('Fallback pages written to '.$directory.'.');

                return Command::SUCCESS;
            }
        );
    }
}
