<?php

namespace Wexample\SymfonyLoader\Helper;

use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyLoader\Controller\AbstractPagesController;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

/**
 * Where the pages an error is answered with are looked for. Named here rather
 * than built where they are used, since the error controller and the renderer's
 * own last resort have to agree on them.
 */
class ErrorPageHelper
{
    final public const DIR = 'system/';

    final public const VIEW_ERROR = 'error';

    final public const VIEW_RENDER_FAILURE = 'render-failure';

    /**
     * The templates that may answer a status, most specific first: the
     * application's page for the code, its generic page, then the bundle's.
     *
     * @return string[]
     */
    public static function viewCandidates(int $statusCode): array
    {
        return [
            self::appView(self::VIEW_ERROR.$statusCode),
            self::appView(self::VIEW_ERROR),
            self::bundleView(self::VIEW_ERROR.$statusCode),
            self::bundleView(self::VIEW_ERROR),
        ];
    }

    /**
     * The page shown when rendering a page threw: the exception is what there
     * is to say, and the loader has nothing else to put on the screen.
     */
    public static function renderFailureView(): string
    {
        return self::bundleView(self::VIEW_RENDER_FAILURE);
    }

    public static function bundleView(string $name = self::VIEW_ERROR): string
    {
        return BundleHelper::ALIAS_PREFIX
            .WexampleSymfonyLoaderBundle::getAlias().'/'
            .AbstractPagesController::RESOURCES_DIR_PAGE
            .self::DIR.$name
            .TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    public static function appView(string $name = self::VIEW_ERROR): string
    {
        return BundleHelper::ALIAS_PREFIX
            .LoaderHelper::TWIG_NAMESPACE_FRONT.'/'
            .AbstractPagesController::RESOURCES_DIR_PAGE
            .self::DIR.$name
            .TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }
}
