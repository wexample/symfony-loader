<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyLoader\Service\AgentContractService;

/**
 * The contracts are read off the fixtures' components, the way a bundle's are:
 * the `.ai.yml` beside a twig template, or beside a vue's.
 */
class AgentContractServiceTest extends TestCase
{
    private Environment $twig;

    private AgentContractService $service;

    protected function setUp(): void
    {
        $loader = new FilesystemLoader();
        $loader->addPath(__DIR__.'/../../Fixtures/AgentContracts', 'Fixtures');

        $this->twig = new Environment($loader);
        $this->service = new AgentContractService();
    }

    public function testAComponentReadsItsContract(): void
    {
        $contract = $this->service->resolve($this->twig, '@Fixtures/components/switch/switch');

        $this->assertSame('switch', $contract['type']);
        $this->assertSame('A switch, on or off.', $contract['description']);
        $this->assertSame(['get', 'set'], array_keys($contract['actions']));

        $get = $contract['actions']['get'];
        $this->assertSame('get', $get['name']);
        $this->assertTrue($get['annotations']['readOnlyHint']);
        // An action taking nothing still describes an object: what MCP expects.
        $this->assertSame('object', $get['inputSchema']['type']);
        $this->assertEquals(new \stdClass(), $get['inputSchema']['properties']);

        $set = $contract['actions']['set'];
        $this->assertSame(['checked'], $set['inputSchema']['required']);
        $this->assertSame('boolean', $set['inputSchema']['properties']['checked']['type']);
        $this->assertArrayNotHasKey('annotations', $set);
    }

    public function testAContractExtendsAnother(): void
    {
        $contract = $this->service->resolve($this->twig, '@Fixtures/components/color-scheme-switch/color-scheme-switch');

        // The kind and the actions of the parent, the description its own.
        $this->assertSame('switch', $contract['type']);
        $this->assertSame('Light or dark colours for the interface.', $contract['description']);
        $this->assertSame(['get', 'set'], array_keys($contract['actions']));
        // An action written again replaces the parent's.
        $this->assertSame('Shows the interface in light (on) or dark (off) colours.', $contract['actions']['set']['description']);
        $this->assertSame('Tells whether the switch is on.', $contract['actions']['get']['description']);
    }

    public function testAVueReadsItsContractBesideItsVueTemplate(): void
    {
        $contract = $this->service->resolve($this->twig, '@Fixtures/components/pagination/pagination');

        $this->assertSame('pagination', $contract['type']);
        $this->assertSame(['next'], array_keys($contract['actions']));
    }

    public function testAComponentWithoutContractHasNone(): void
    {
        $this->assertNull($this->service->resolve($this->twig, '@Fixtures/components/plain/plain'));
        $this->assertNull($this->service->resolve($this->twig, '@Fixtures/components/missing/missing'));
    }

    public function testAContractMayStandAloneAndBeNamedWhereAComponentIsDrawn(): void
    {
        // A contract beside no template: the loader's form, whose markup is
        // the application's.
        $contract = $this->service->resolve($this->twig, '@Fixtures/components/form');

        $this->assertSame('form', $contract['type']);
        $this->assertSame(['submit'], array_keys($contract['actions']));

        // A component drawn from a template of its own, told to be a form.
        $component = new ComponentRenderNode('previous', [AgentContractService::OPTION_AGENT_CONTRACT => '@Fixtures/components/form']);
        $component->setDefaultView('@Fixtures/components/plain/plain');

        $this->assertSame('form', $this->service->forComponent($this->twig, $component)['type']);
    }

    public function testWhereAComponentIsDrawnMaySayWhatItIsFor(): void
    {
        $component = new ComponentRenderNode('class', ['agent_description' => 'The theme of this page.']);
        $component->setDefaultView('@Fixtures/components/switch/switch');

        $contract = $this->service->forComponent($this->twig, $component);

        $this->assertSame('The theme of this page.', $contract['description']);
        $this->assertSame(['get', 'set'], array_keys($contract['actions']));

        $plain = new ComponentRenderNode('class');
        $plain->setDefaultView('@Fixtures/components/plain/plain');

        $this->assertNull($this->service->forComponent($this->twig, $plain));
    }
}
