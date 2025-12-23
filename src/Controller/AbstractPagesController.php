<?php

namespace Wexample\SymfonyDesignSystem\Controller;

use Symfony\Component\HttpFoundation\Response;
use Wexample\Helpers\Helper\ClassHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Service\AdaptiveResponseService;
use Wexample\SymfonyDesignSystem\Service\LayoutService;
use Wexample\SymfonyDesignSystem\Service\PageService;
use Wexample\SymfonyDesignSystem\Service\RenderPassBagService;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Controller\Traits\HasSimpleRoutesControllerTrait;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyHelpers\Helper\TemplateHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyHelpers\Traits\BundleClassTrait;

abstract class AbstractPagesController extends AbstractController
{
    use HasSimpleRoutesControllerTrait;

    public const NAMESPACE_CONTROLLER = 'App\\Controller\\';

    public const NAMESPACE_PAGES = self::NAMESPACE_CONTROLLER . 'Pages\\';

    public const RESOURCES_DIR_PAGE = VariableHelper::PLURAL_PAGE . FileHelper::FOLDER_SEPARATOR;

    public const BUNDLE_TEMPLATE_SEPARATOR = '::';

    public function __construct(
        AdaptiveResponseService $adaptiveResponseService,
        LayoutService $layoutService,
        RenderPassBagService $renderPassBagService,
        protected PageService $pageService
    ) {
        parent::__construct(
            $adaptiveResponseService,
            $layoutService,
            $renderPassBagService
        );
    }

    public static function buildTemplatePath(
        string $view,
        AbstractBundle|string|null $bundleClass = null
    ): string {
        $base = '';

        if (str_contains($view, self::BUNDLE_TEMPLATE_SEPARATOR)) {
            $exp = explode(self::BUNDLE_TEMPLATE_SEPARATOR, $view);
            $base = $exp[0] . FileHelper::FOLDER_SEPARATOR . BundleHelper::BUNDLE_PATH_TEMPLATES . $base;
            $view = $exp[1];
        }

        return BundleHelper::ALIAS_PREFIX
            . static::getTemplateLocationPrefix() . '/'
            . $base . $view . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    public static function buildControllerTemplatePath(
        string $pageName,
        string $bundle = null
    ): string {
        $bundle = $bundle ?: static::getDefaultPageBundleClass();

        $parts = TemplateHelper::explodeControllerNamespaceSubParts(static::class, $bundle);
        $parts[] = $pageName;

        return static::buildTemplatePath(TemplateHelper::joinNormalizedParts($parts), $bundle);
    }

    public static function getDefaultPageBundleClass(): ?string
    {
        if (ClassHelper::classUsesTrait(static::class, BundleClassTrait::class)) {
            return static::getControllerBundle();
        }

        return null;
    }

    protected function renderPage(
        string $pageName,
        array $parameters = [],
        Response $response = null,
        AbstractBundle|string $bundle = null,
        RenderPass $renderPass = null
    ): Response {
        return $this->adaptiveRender(
            $this->buildControllerTemplatePath($pageName, $bundle),
            $parameters,
            $response,
            renderPass: $renderPass
        );
    }
}
