<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use RuntimeException;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorage;
use Symfony\Component\Security\Core\User\InMemoryUser;
use Wexample\SymfonyLoader\Interface\AgentBackToolInterface;
use Wexample\SymfonyLoader\Service\AgentBackToolsService;

/**
 * What an application asks of an agent's call before the page hears of it:
 * whether the server answers it, what it answers, and the page's tool list
 * completed with the server's.
 */
class AgentBackToolsServiceTest extends TestCase
{
    private TokenStorage $tokenStorage;

    private AgentBackToolsService $service;

    protected function setUp(): void
    {
        $this->tokenStorage = new TokenStorage();
        $this->service = new AgentBackToolsService([$this->tool('echo'), $this->tool('fail')], $this->tokenStorage);
    }

    public function testACallIsTheServersByItsNameDirectlyOrThroughCallTool(): void
    {
        self::assertSame(['said' => 'hi'], $this->service->resolve(['name' => 'echo', 'arguments' => ['said' => 'hi']])['arguments']);
        self::assertSame(['said' => 'hi'], $this->service->resolve(['name' => 'call_tool', 'arguments' => ['name' => 'echo', 'arguments' => ['said' => 'hi']]])['arguments']);
        self::assertSame(['said' => 'hi'], $this->service->resolve(['name' => 'call_tool', 'arguments' => ['name' => 'echo', 'said' => 'hi']])['arguments']);
        self::assertNull($this->service->resolve(['name' => 'act', 'arguments' => []]));
        self::assertNull($this->service->resolve(['name' => 'call_tool', 'arguments' => ['name' => 'inspect_page']]));
    }

    public function testACallAnsweredHereIsMarkedForThePage(): void
    {
        $marked = $this->service->markAnsweredHere(['name' => 'echo']);

        self::assertTrue($this->service->isAnsweredHere($marked));
        self::assertFalse($this->service->isAnsweredHere(['name' => 'echo']));
    }

    public function testTheAnswerIsTheValueOrTheErrorAsThePageAnswers(): void
    {
        self::assertSame([['said' => 'hi', 'as' => null]], $this->service->answer(['name' => 'echo', 'arguments' => ['said' => 'hi']]));
        self::assertSame([['error' => 'fail went wrong']], $this->service->answer(['name' => 'fail']));
    }

    public function testItRunsAsTheOwnerAndPutsTheTokenBack(): void
    {
        $results = $this->service->answer(['name' => 'echo'], new InMemoryUser('owner@example.org', null, ['ROLE_USER']));

        self::assertSame('owner@example.org', $results[0]['as']);
        self::assertNull($this->tokenStorage->getToken());
    }

    public function testThePagesToolListIsCompletedUnlessThePageAloneWasAskedFor(): void
    {
        $page = [[['name' => 'inspect_page']]];

        $completed = $this->service->completeToolList(['name' => 'list_tools', 'arguments' => []], $page);
        self::assertSame(['inspect_page', 'echo', 'fail'], array_column($completed[0], 'name'));

        $filtered = $this->service->completeToolList(['name' => 'call_tool', 'arguments' => ['name' => 'list_tools', 'arguments' => ['filter' => 'fail']]], $page);
        self::assertSame(['inspect_page', 'fail'], array_column($filtered[0], 'name'));

        self::assertSame($page, $this->service->completeToolList(['name' => 'list_tools', 'arguments' => ['scope' => 'front']], $page));
        self::assertSame($page, $this->service->completeToolList(['name' => 'act'], $page));
    }

    public function testAToolTurnedOffByNameIsNeitherListedNorRun(): void
    {
        $service = new AgentBackToolsService([$this->tool('echo'), $this->tool('fail')], $this->tokenStorage, ['disabled' => ['fail']]);

        self::assertSame(['echo'], array_column($service->definitions(), 'name'));
        self::assertNull($service->resolve(['name' => 'fail']));
        self::assertSame(['enabled' => true, 'disabled' => ['fail']], $service->frontSettings());
    }

    public function testTheServersToolsOffLeaveEveryCallToThePage(): void
    {
        $service = new AgentBackToolsService([$this->tool('echo')], $this->tokenStorage, ['back' => false]);

        self::assertFalse($service->handles(['name' => 'echo']));
        self::assertSame([[['name' => 'inspect_page']]], $service->completeToolList(['name' => 'list_tools'], [[['name' => 'inspect_page']]]));
    }

    public function testThePagesToolsOffLeaveEveryCallToTheServer(): void
    {
        $service = new AgentBackToolsService([$this->tool('echo')], $this->tokenStorage, ['front' => false]);

        self::assertTrue($service->handles(['name' => 'inspect_page']));
        self::assertSame(['echo'], array_column($service->answer(['name' => 'list_tools'])[0], 'name'));
        self::assertSame([['error' => 'No tool "inspect_page": list_tools returns the ones there are.']], $service->answer(['name' => 'call_tool', 'arguments' => ['name' => 'inspect_page']]));
    }

    private function tool(string $name): AgentBackToolInterface
    {
        $tokenStorage = &$this->tokenStorage;

        return new class($name, $tokenStorage) implements AgentBackToolInterface {
            public function __construct(private string $name, private TokenStorage $tokenStorage)
            {
            }

            public function getName(): string
            {
                return $this->name;
            }

            public function getDescription(): string
            {
                return $this->name.' tool';
            }

            public function getInputSchema(): array
            {
                return ['type' => 'object'];
            }

            public function getAnnotations(): array
            {
                return [];
            }

            public function execute(array $arguments): mixed
            {
                if ('fail' === $this->name) {
                    throw new RuntimeException('fail went wrong');
                }

                return $arguments + ['as' => $this->tokenStorage->getToken()?->getUserIdentifier()];
            }
        };
    }
}
