<?php

namespace Wexample\SymfonyLoader\Class;

/**
 * One thing the application must be given for a bundle to work — a variable,
 * a key of configuration —, whether it is, and how to give it. A bundle lists
 * its own (RequirementProviderInterface); RequirementsService gathers them.
 */
class Requirement
{
    public function __construct(
        public readonly string $name,
        public readonly bool $met,
        public readonly string $hint,
    ) {
    }

    /**
     * An environment variable set to something: read where Symfony reads it,
     * the server's variables first, as `%env()%` does.
     */
    public static function env(string $name, string $hint): self
    {
        $value = $_SERVER[$name] ?? $_ENV[$name] ?? getenv($name);

        return new self($name, is_string($value) && trim($value) !== '', $hint);
    }
}
