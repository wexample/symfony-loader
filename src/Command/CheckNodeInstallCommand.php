<?php

namespace Wexample\SymfonyLoader\Command;

use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyHelpers\Command\AbstractCheckNodeInstallCommand;

class CheckNodeInstallCommand extends AbstractCheckNodeInstallCommand
{
    use SymfonyLoaderBundleClassTrait;
}
