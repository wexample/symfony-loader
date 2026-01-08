<?php

namespace Wexample\SymfonyLoader\Exception;

use RuntimeException;

class AssetsNotBuiltException extends RuntimeException
{
    public function __construct(
        string $message = 'Frontend assets need to be built.',
        private string $hint = 'Run: yarn watch'
    )
    {
        parent::__construct($message);
    }

    public function getHint(): string
    {
        return $this->hint;
    }
}
