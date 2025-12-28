<?php

namespace Wexample\SymfonyLoader\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\Helpers\Helper\ClassHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;
use Wexample\SymfonyLoader\Service\LayoutService;
use Wexample\SymfonyLoader\Service\PageService;
use Wexample\SymfonyLoader\Service\RenderPassBagService;
use Wexample\SymfonyHelpers\Attribute\SimpleMethodResolver;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Controller\Traits\HasSimpleRoutesControllerTrait;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyHelpers\Traits\BundleClassTrait;

abstract class AbstractPagesController extends AbstractLoaderController
{
    use HasSimpleRoutesControllerTrait;

    public const NAMESPACE_CONTROLLER = 'App\\Controller\\';

    public const NAMESPACE_PAGES = self::NAMESPACE_CONTROLLER.'Pages\\';

    public const RESOURCES_DIR_PAGE = VariableHelper::PLURAL_PAGE.FileHelper::FOLDER_SEPARATOR;

    public const BUNDLE_TEMPLATE_SEPARATOR = '::';

    public function __construct(
        AdaptiveResponseService $adaptiveResponseService,
        LayoutService $layoutService,
        RenderPassBagService $renderPassBagService,
        KernelInterface $kernel,
        protected PageService $pageService,
    ) {
        parent::__construct(
            $adaptiveResponseService,
            $layoutService,
            $renderPassBagService,
            $kernel
        );
    }

    protected function buildTemplatePath(
        string $view,
        AbstractBundle|string|null $bundleClass = null
    ): string {
        $base = '';
        $bundleClass = $bundleClass ?: $this->getControllerBundle();

        if (str_contains($view, self::BUNDLE_TEMPLATE_SEPARATOR)) {
            $exp = explode(self::BUNDLE_TEMPLATE_SEPARATOR, $view);
            $base = $exp[0].FileHelper::FOLDER_SEPARATOR.BundleHelper::BUNDLE_PATH_TEMPLATES.$base;
            $view = $exp[1];
        }

        return BundleHelper::ALIAS_PREFIX
            .($bundleClass ? $bundleClass::getAlias() : 'front').'/'
            .$base.$view.TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    protected function buildControllerTemplatePath(
        string $pageName,
        string $bundle = null
    ): string {
        $bundle = $bundle ?: $this->getDefaultPageBundleClass();

        $parts = TemplateHelper::explodeControllerNamespaceSubParts(static::class, $bundle);
        $parts[] = $pageName;

        return $this->buildTemplatePath(TemplateHelper::joinNormalizedParts($parts), $bundle);
    }

    protected function getDefaultPageBundleClass(): ?string
    {
        if (ClassHelper::classUsesTrait($this, BundleClassTrait::class)) {
            return $this::getControllerBundle();
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

    #[SimpleMethodResolver]
    public function resolveSimpleRoute(string $routeName): Response
    {
        return $this->renderPage(
            $routeName,
        );
    }
}
