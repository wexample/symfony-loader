<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\App\Service;

use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Interface\UsageChoiceReaderInterface;

/**
 * The choice a test saves in the session read back, standing in for what an
 * application keeps its visitors' choices in (symfony-preference).
 */
class SessionUsageChoiceReader implements UsageChoiceReaderInterface
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {
    }

    public function chosenUsage(string $usageName): ?string
    {
        $request = $this->requestStack->getMainRequest();
        if (! $request?->hasSession()) {
            return null;
        }

        $value = $request->getSession()->get('ui_state.ui.'.$usageName);

        return is_string($value) ? $value : null;
    }
}
