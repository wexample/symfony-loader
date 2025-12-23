<?php

namespace Wexample\SymfonyDesignSystem\Traits;

use Wexample\SymfonyDesignSystem\WexampleSymfonyDesignSystemBundle;
use Wexample\SymfonyHelpers\Traits\BundleClassTrait;

trait SymfonyDesignSystemBundleClassTrait
{
    use BundleClassTrait;

    public static function getBundleClassName(): string
    {
        return WexampleSymfonyDesignSystemBundle::class;
    }
}
