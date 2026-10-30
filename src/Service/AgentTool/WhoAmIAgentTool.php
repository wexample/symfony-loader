<?php

namespace Wexample\SymfonyLoader\Service\AgentTool;

use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Interface\AgentBackToolInterface;

/**
 * Who the agent is talking to: the account, its roles, its language — what
 * it may try before trying it.
 */
final readonly class WhoAmIAgentTool implements AgentBackToolInterface
{
    public function __construct(
        private Security $security,
        private RequestStack $requestStack,
    ) {
    }

    public function getName(): string
    {
        return 'whoami';
    }

    public function getDescription(): string
    {
        return 'Tells who the user is: their account, their roles and the language they read the application in.';
    }

    public function getInputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass()];
    }

    public function getAnnotations(): array
    {
        return ['readOnlyHint' => true];
    }

    public function execute(array $arguments): mixed
    {
        $user = $this->security->getUser();

        return [
            'signedIn' => null !== $user,
            'account' => $user?->getUserIdentifier(),
            'roles' => $user?->getRoles() ?? [],
            'locale' => $this->requestStack->getCurrentRequest()?->getLocale(),
        ];
    }
}
