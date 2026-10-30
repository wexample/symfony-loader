<?php

namespace Wexample\SymfonyLoader\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Http\Authenticator\Token\PostAuthenticationToken;
use Throwable;
use Wexample\SymfonyLoader\Interface\AgentBackToolInterface;

/**
 * The tools an agent runs on the server, and what an application does with a
 * call before the page hears of it.
 *
 * An agent's call reaches the application first — a callback, a worker
 * saving it —, then the page through its live topic. Between the two, the
 * application asks `resolve()`: a call to a tool of the server is run here
 * (`answer()`), and goes to the page marked as answered (`markAnsweredHere()`),
 * for the thread to show it and not run it. Every other call is the page's.
 *
 * The page answers `list_tools` with its own; the application completes that
 * answer with the server's before sending it on (`completeToolList()`): the
 * agent reads one list, and the page never hears of the server's tools.
 *
 * Calls come as the agent writes them: `{name, arguments}`, or through
 * `call_tool` — `{name: 'call_tool', arguments: {name, arguments}}` —, its
 * arguments sometimes flat beside the name.
 *
 * What the application lets the agents use is its configuration
 * (`wexample_symfony_loader.agent_tools`): the server's tools off (`back`),
 * the page's off (`front`) — the server then answers every call, `list_tools`
 * included, the page only showing them —, and tools off by name (`disabled`),
 * whichever side runs them; the page reads its part (`frontSettings()`).
 */
final readonly class AgentBackToolsService
{
    final public const string TOOL_LIST = 'list_tools';

    final public const string TOOL_CALL = 'call_tool';

    final public const string SCOPE_FRONT = 'front';

    final public const string SCOPE_BACK = 'back';

    /** What a call carries once the server answered it. */
    final public const string KEY_ANSWERED_BY = 'runBy';

    final public const string ANSWERED_BY_BACK = 'back';

    /** The firewall name a token made for an agent's call says. */
    private const string FIREWALL_AGENT = 'agent';

    /**
     * @param iterable<AgentBackToolInterface> $tools
     * @param array{front?: bool, back?: bool, disabled?: string[]} $settings
     */
    public function __construct(
        #[AutowireIterator(AgentBackToolInterface::TAG)]
        private iterable $tools,
        private TokenStorageInterface $tokenStorage,
        #[Autowire(param: 'loader.agent_tools')]
        private array $settings = [],
    ) {
    }

    public function isFrontEnabled(): bool
    {
        return $this->settings['front'] ?? true;
    }

    public function isBackEnabled(): bool
    {
        return $this->settings['back'] ?? true;
    }

    /**
     * @return string[]
     */
    public function disabledTools(): array
    {
        return $this->settings['disabled'] ?? [];
    }

    /**
     * What the page is told of the settings, with the layout's render data.
     *
     * @return array{enabled: bool, disabled: string[]}
     */
    public function frontSettings(): array
    {
        return ['enabled' => $this->isFrontEnabled(), 'disabled' => $this->disabledTools()];
    }

    /**
     * Whether the server answers a call: one of its tools — or any call, the
     * page's tools being off.
     *
     * @param array<string, mixed> $call
     */
    public function handles(array $call): bool
    {
        return ! $this->isFrontEnabled() || null !== $this->resolve($call);
    }

    /**
     * @return array<string, AgentBackToolInterface>
     */
    public function all(): array
    {
        if (! $this->isBackEnabled()) {
            return [];
        }

        $tools = [];

        foreach ($this->tools as $tool) {
            if (! in_array($tool->getName(), $this->disabledTools(), true)) {
                $tools[$tool->getName()] = $tool;
            }
        }

        return $tools;
    }

    public function get(string $name): ?AgentBackToolInterface
    {
        return $this->all()[$name] ?? null;
    }

    /**
     * The tools as `list_tools` describes them, the page's way: name,
     * description, inputSchema, annotations, and where they run.
     *
     * @return array<int, array<string, mixed>>
     */
    public function definitions(?string $filter = null): array
    {
        $needle = $filter ? mb_strtolower($filter) : null;
        $definitions = [];

        foreach ($this->all() as $tool) {
            if ($needle && ! str_contains(mb_strtolower($tool->getName().' '.$tool->getDescription()), $needle)) {
                continue;
            }

            $definitions[] = [
                'name' => $tool->getName(),
                'description' => $tool->getDescription(),
                'inputSchema' => $tool->getInputSchema(),
                'annotations' => $tool->getAnnotations(),
                'scope' => self::SCOPE_BACK,
            ];
        }

        return $definitions;
    }

    /**
     * The tool of the server a call reaches, and its arguments, through
     * `call_tool` or not; null when the call is the page's.
     *
     * @param array<string, mixed> $call
     *
     * @return array{tool: AgentBackToolInterface, arguments: array<string, mixed>}|null
     */
    public function resolve(array $call): ?array
    {
        $name = $call['name'] ?? null;
        $arguments = is_array($call['arguments'] ?? null) ? $call['arguments'] : [];

        if (self::TOOL_CALL === $name) {
            $flat = $arguments;
            unset($flat['name'], $flat['arguments']);
            $name = $arguments['name'] ?? null;
            $arguments = is_array($arguments['arguments'] ?? null) ? $arguments['arguments'] : $flat;
        }

        $tool = is_string($name) ? $this->get($name) : null;

        return $tool ? ['tool' => $tool, 'arguments' => $arguments] : null;
    }

    /**
     * @param array<string, mixed> $call
     */
    public function isAnsweredHere(array $call): bool
    {
        return self::ANSWERED_BY_BACK === ($call[self::KEY_ANSWERED_BY] ?? null);
    }

    /**
     * The call as the page receives it: shown, not run.
     *
     * @param array<string, mixed> $call
     *
     * @return array<string, mixed>
     */
    public function markAnsweredHere(array $call): array
    {
        return $call + [self::KEY_ANSWERED_BY => self::ANSWERED_BY_BACK];
    }

    /**
     * What a call of the server's tools answers, as the page answers its
     * own: `[value]`, or `[{error}]`. Run as the user when one is given — the
     * owner of the conversation, in a request that is not theirs.
     *
     * @param array<string, mixed> $call
     *
     * @return array<int, mixed>
     */
    public function answer(array $call, ?UserInterface $user = null): array
    {
        // The page's tools off, the list is the server's alone.
        if (! $this->isFrontEnabled() && null !== ($listArguments = $this->toolListArguments($call))) {
            return self::SCOPE_FRONT === ($listArguments['scope'] ?? null)
                ? [[]]
                : [$this->definitions(is_string($listArguments['filter'] ?? null) ? $listArguments['filter'] : null)];
        }

        $resolved = $this->resolve($call);

        if (! $resolved) {
            $named = self::TOOL_CALL === ($call['name'] ?? null) && is_array($call['arguments'] ?? null)
                ? ($call['arguments']['name'] ?? '')
                : ($call['name'] ?? '');

            return [['error' => sprintf('No tool "%s": list_tools returns the ones there are.', is_string($named) ? $named : '')]];
        }

        try {
            return [$this->runAs($user, fn () => $resolved['tool']->execute($resolved['arguments']))];
        } catch (Throwable $exception) {
            return [['error' => $exception->getMessage()]];
        }
    }

    /**
     * Whether a call asks for the list of the tools — the page's answer to
     * it being completed with the server's.
     *
     * @param array<string, mixed> $call
     */
    public function isToolList(array $call): bool
    {
        return null !== $this->toolListArguments($call);
    }

    /**
     * The page's answer to `list_tools`, completed with the tools of the
     * server — unless the agent asked for the page's alone.
     *
     * @param array<string, mixed> $call
     * @param array<int, mixed> $results
     *
     * @return array<int, mixed>
     */
    public function completeToolList(array $call, array $results): array
    {
        $arguments = $this->toolListArguments($call);

        if (null === $arguments || self::SCOPE_FRONT === ($arguments['scope'] ?? null)) {
            return $results;
        }

        $filter = is_string($arguments['filter'] ?? null) ? $arguments['filter'] : null;
        $listed = is_array($results[0] ?? null) && array_is_list($results[0]) ? $results[0] : [];

        return [array_merge($listed, $this->definitions($filter)), ...array_slice($results, 1)];
    }

    /**
     * Runs a piece of work with the user's token in place, the one there was
     * put back after: voters and access rules answer for the user.
     */
    public function runAs(?UserInterface $user, callable $work): mixed
    {
        if (! $user) {
            return $work();
        }

        $previous = $this->tokenStorage->getToken();
        $this->tokenStorage->setToken(new PostAuthenticationToken($user, self::FIREWALL_AGENT, $user->getRoles()));

        try {
            return $work();
        } finally {
            $this->tokenStorage->setToken($previous);
        }
    }

    /**
     * @param array<string, mixed> $call
     *
     * @return array<string, mixed>|null
     */
    private function toolListArguments(array $call): ?array
    {
        $arguments = is_array($call['arguments'] ?? null) ? $call['arguments'] : [];

        if (self::TOOL_LIST === ($call['name'] ?? null)) {
            return $arguments;
        }

        if (self::TOOL_CALL === ($call['name'] ?? null) && self::TOOL_LIST === ($arguments['name'] ?? null)) {
            return is_array($arguments['arguments'] ?? null) ? $arguments['arguments'] : [];
        }

        return null;
    }
}
