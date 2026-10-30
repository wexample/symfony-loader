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
 * A page offered says what it is for (`#[RouteDescription]`, symfony-helpers):
 * the agent chooses on it. One that does not is left out, and the log says
 * so. Conditions on who an agent may take there will come here.
 *
 *     #[AgentRoute]
 *     #[RouteDescription('The models the manager runs, with their state.')]
 *     #[Route(path: '', name: self::ROUTE_INDEX)]
 *     public function index(): Response
 */
#[Attribute(Attribute::TARGET_CLASS | Attribute::TARGET_METHOD)]
final readonly class AgentRoute
{
}
