<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\Controller\Pages\Demo;

use Wexample\SymfonyHelpers\Controller\AbstractController;
use Wexample\SymfonyHelpers\Traits\BundleClassTrait;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;

/**
 * A controller a bundle ships, its namespace deeper than `Bundle\Controller`.
 */
class SampleSectionController extends AbstractController
{
    use BundleClassTrait;

    public static function getBundleClassName(): string
    {
        return WexampleSymfonyLoaderBundle::class;
    }

    public function showItem(): void
    {
    }
}
