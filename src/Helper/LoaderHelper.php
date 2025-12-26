<?php

namespace Wexample\SymfonyLoader\Helper;

use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class LoaderHelper
{
    final public const BUNDLE_NAME = 'WexampleSymfonyLoaderBundle';
    final public const FOLDER_FRONT_ALIAS = BundleHelper::ALIAS_PREFIX.LoaderHelper::BUNDLE_NAME.FileHelper::FOLDER_SEPARATOR;
    final public const TWIG_NAMESPACE_FRONT = 'front';
}
