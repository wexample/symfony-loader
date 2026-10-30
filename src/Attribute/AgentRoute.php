<?php

namespace Wexample\SymfonyLoader\Attribute;

use Attribute;

/**
 * A page offered to the agents: the server's `list_pages` lists only the
 * routes whose controller says so — on the method, or on the class for all
 * its pages —, then only those the user may open. A page left unmarked is
 * one an agent never hears of, however open it is: a logout link, a login
 * link, an api's documentation.
 *
 * `description` says, in english, what the page is for — the agent chooses
 * on it rather than on a route's name. Conditions on who an agent may take
 * there will come here too.
 *
 *     #[AgentRoute(description: 'The models the account runs, with their state.')]
 *     #[Route(path: '', name: self::ROUTE_INDEX)]
 *     public function index(): Response
 */
#[Attribute(Attribute::TARGET_CLASS | Attribute::TARGET_METHOD)]
final readonly class AgentRoute
{
    public function __construct(
        public ?string $description = null,
    ) {
    }
}
