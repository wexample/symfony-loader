<?php

namespace Wexample\SymfonyLoader\Service;

use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;
use Wexample\SymfonyLoader\Class\Requirement;
use Wexample\SymfonyLoader\Exception\RequirementsNotMetException;
use Wexample\SymfonyLoader\Interface\RequirementProviderInterface;

/**
 * Every requirement the installed bundles declare, read when asked — the
 * environment may change between two calls, so nothing is kept.
 */
class RequirementsService
{
    /**
     * @param iterable<RequirementProviderInterface> $providers
     */
    public function __construct(
        #[AutowireIterator(RequirementProviderInterface::TAG)]
        private readonly iterable $providers = [],
    ) {
    }

    /**
     * @return list<Requirement>
     */
    public function getRequirements(): array
    {
        $requirements = [];

        foreach ($this->providers as $provider) {
            foreach ($provider->getRequirements() as $requirement) {
                $requirements[] = $requirement;
            }
        }

        return $requirements;
    }

    /**
     * @return list<Requirement>
     */
    public function findMissing(): array
    {
        return array_values(array_filter(
            $this->getRequirements(),
            static fn (Requirement $requirement) => ! $requirement->met
        ));
    }

    /**
     * @throws RequirementsNotMetException
     */
    public function assertMet(): void
    {
        if ($missing = $this->findMissing()) {
            throw new RequirementsNotMetException($missing);
        }
    }
}
