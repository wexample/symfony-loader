<?php

namespace Wexample\SymfonyLoader\CacheWarmer;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\CacheWarmer\CacheWarmerInterface;
use Wexample\SymfonyLoader\Service\RequirementsService;

/**
 * The container being built in development refuses to start without what the
 * bundles need: the next page answers 500, naming every one missing, rather
 * than a mail failing in a worker later on.
 *
 * Development only. An image is built where the production environment is not
 * there yet; production checks at its start, with `loader:requirements`.
 * Tests neither: a fixture application gives what its tests use.
 */
class RequirementsCacheWarmer implements CacheWarmerInterface
{
    public function __construct(
        private readonly RequirementsService $requirements,
        #[Autowire(param: 'kernel.debug')]
        private readonly bool $debug,
        #[Autowire(param: 'kernel.environment')]
        private readonly string $environment,
    ) {
    }

    public function isOptional(): bool
    {
        return false;
    }

    public function warmUp(string $cacheDir, ?string $buildDir = null): array
    {
        if ($this->debug && $this->environment !== 'test') {
            $this->requirements->assertMet();
        }

        return [];
    }
}
