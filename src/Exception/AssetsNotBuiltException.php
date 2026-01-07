<?php

namespace Wexample\SymfonyLoader\Exception;

use RuntimeException;

class AssetsNotBuiltException extends RuntimeException
{
    public function __construct(string $message = 'Frontend assets need to be built.')
    {
        parent::__construct($message);
    }
}
