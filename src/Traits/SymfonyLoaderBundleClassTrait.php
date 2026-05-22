<?php

namespace Wexample\SymfonyLoader\Traits;

use Wexample\SymfonyHelpers\Traits\BundleClassTrait;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;

trait SymfonyLoaderBundleClassTrait
{
    use BundleClassTrait;

    public static function getBundleClassName(): string
    {
        return WexampleSymfonyLoaderBundle::class;
    }
}
