<?php

namespace Wexample\SymfonyLoader\Traits;

use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyHelpers\Traits\BundleClassTrait;

trait SymfonyLoaderBundleClassTrait
{
    use BundleClassTrait;

    public static function getBundleClassName(): string
    {
        return WexampleSymfonyLoaderBundle::class;
    }
}
