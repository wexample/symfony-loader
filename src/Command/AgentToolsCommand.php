<?php

namespace Wexample\SymfonyLoader\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Wexample\SymfonyHelpers\Command\AbstractBundleCommand;
use Wexample\SymfonyHelpers\Service\BundleService;
use Wexample\SymfonyLoader\Service\AgentBackToolsService;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;

/**
 * The tools an agent finds on the server, as `list_tools` adds them to the
 * page's — and one of them run, as a user, to see what the agent would read.
 *
 *     loader:agent-tools
 *     loader:agent-tools --run=list_pages --arguments='{"query":"model"}' --user=me@example.org
 */
class AgentToolsCommand extends AbstractBundleCommand
{
    use SymfonyLoaderBundleClassTrait;

    private const string OPTION_RUN = 'run';
    private const string OPTION_ARGUMENTS = 'arguments';
    private const string OPTION_USER = 'user';

    public function __construct(
        BundleService $bundleService,
        private readonly AgentBackToolsService $agentBackTools,
        #[Autowire(service: 'security.user_providers')]
        private readonly UserProviderInterface $userProvider,
        ?string $name = null,
    ) {
        parent::__construct($bundleService, $name);
    }

    protected function configure(): void
    {
        parent::configure();

        $this
            ->setDescription('List the tools an agent runs on the server, or run one as a user.')
            ->addOption(self::OPTION_RUN, null, InputOption::VALUE_REQUIRED, 'The tool to run')
            ->addOption(self::OPTION_ARGUMENTS, null, InputOption::VALUE_REQUIRED, 'Its arguments, as JSON', '{}')
            ->addOption(self::OPTION_USER, null, InputOption::VALUE_REQUIRED, 'Who it runs as, by identifier');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $name = $input->getOption(self::OPTION_RUN);

        if (! $name) {
            $io->table(
                ['Name', 'Read only', 'Description'],
                array_map(
                    static fn (array $definition): array => [
                        $definition['name'],
                        ($definition['annotations']['readOnlyHint'] ?? false) ? 'yes' : '',
                        $definition['description'],
                    ],
                    $this->agentBackTools->definitions()
                )
            );

            return Command::SUCCESS;
        }

        $arguments = json_decode((string) $input->getOption(self::OPTION_ARGUMENTS), true);
        $identifier = $input->getOption(self::OPTION_USER);
        $user = $identifier ? $this->userProvider->loadUserByIdentifier($identifier) : null;

        $output->writeln(json_encode(
            $this->agentBackTools->answer(['name' => $name, 'arguments' => is_array($arguments) ? $arguments : []], $user),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ));

        return Command::SUCCESS;
    }
}
