<?php

namespace Wexample\SymfonyLoader\Command;

use Wexample\SymfonyHelpers\Command\AbstractCheckNodeInstallCommand;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;

class CheckNodeInstallCommand extends AbstractCheckNodeInstallCommand
{
    use SymfonyLoaderBundleClassTrait;
}
