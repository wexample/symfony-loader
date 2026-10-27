<?php

namespace Wexample\SymfonyLoader\Interface;

use Wexample\SymfonyLoader\Class\Requirement;

/**
 * A bundle naming what the application must give it — the variable or the
 * key without which it fails at the first use, a mail never sent. Tagged by
 * the interface alone: implementing it is declaring them.
 */
interface RequirementProviderInterface
{
    final public const string TAG = 'wexample_symfony_loader.requirement_provider';

    /**
     * @return iterable<Requirement>
     */
    public function getRequirements(): iterable;
}
