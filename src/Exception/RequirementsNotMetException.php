<?php

namespace Wexample\SymfonyLoader\Exception;

use RuntimeException;
use Wexample\SymfonyLoader\Class\Requirement;

/**
 * What the application was not given, every requirement at once: one
 * failure that lists them all beats fixing them one restart at a time.
 */
class RequirementsNotMetException extends RuntimeException
{
    /**
     * @param list<Requirement> $missing
     */
    public function __construct(public readonly array $missing)
    {
        parent::__construct(
            "The application is missing what its bundles need:\n".implode("\n", array_map(
                static fn (Requirement $requirement) => '- '.$requirement->name.': '.$requirement->hint,
                $missing
            ))
        );
    }
}
