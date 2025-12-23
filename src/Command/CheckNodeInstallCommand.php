<?php

namespace Wexample\SymfonyLoader\Command;

use Wexample\SymfonyLoader\Traits\SymfonyDesignSystemBundleClassTrait;
use Wexample\SymfonyHelpers\Command\AbstractCheckNodeInstallCommand;

class CheckNodeInstallCommand extends AbstractCheckNodeInstallCommand
{
    use SymfonyDesignSystemBundleClassTrait;
}
