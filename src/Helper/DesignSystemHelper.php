<?php

namespace Wexample\SymfonyDesignSystem\Helper;

use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class DesignSystemHelper
{
    final public const BUNDLE_NAME = 'WexampleSymfonyDesignSystemBundle';
    final public const FOLDER_FRONT_ALIAS = BundleHelper::ALIAS_PREFIX.DesignSystemHelper::BUNDLE_NAME.FileHelper::FOLDER_SEPARATOR;
    final public const TWIG_NAMESPACE_FRONT = 'front';
}
