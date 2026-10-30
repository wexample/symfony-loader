<?php

namespace Wexample\SymfonyLoader\Interface;

/**
 * A tool an agent runs on the server, as the user it talks to: the page's
 * own tools run in the browser (AgentToolsService, in the assets), these run
 * here, and the agent finds both in one list (`list_tools`).
 *
 * A service implementing it is a tool, nothing else to declare: the loader
 * tags it (WexampleSymfonyLoaderExtension). Its name is
 * unique across the page's tools and the server's; its description and its
 * schema are in english, as the page's contracts are. It runs with the
 * user's token in place (AgentBackToolsService::runAs), so voters and
 * access rules answer as they do for the user's own requests.
 */
interface AgentBackToolInterface
{
    public const string TAG = 'wexample.agent_back_tool';

    public function getName(): string;

    public function getDescription(): string;

    /**
     * The JSON schema of its arguments: `{type: object, properties, required}`.
     *
     * @return array<string, mixed>
     */
    public function getInputSchema(): array;

    /**
     * `readOnlyHint`, `destructiveHint`, `idempotentHint`, as MCP says them.
     *
     * @return array<string, bool>
     */
    public function getAnnotations(): array;

    /**
     * What the agent is told: anything json can say. An exception is told as
     * an error, its message the sentence the agent reads.
     *
     * @param array<string, mixed> $arguments
     */
    public function execute(array $arguments): mixed;
}
