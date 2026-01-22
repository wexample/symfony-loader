<?php

namespace Wexample\SymfonyLoader\Service;

use Symfony\Component\Routing\RouterInterface;
use Wexample\Helpers\Helper\ClassHelper;
use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyHelpers\Attribute\SimpleMethodResolver;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Controller\Traits\HasSimpleRoutesControllerTrait;
use Wexample\SymfonyHelpers\Helper\RouteHelper;
use Wexample\SymfonyLoader\Controller\AbstractLoaderController;
use Wexample\SymfonyLoader\Controller\AbstractPagesController;
use Wexample\SymfonyLoader\Rendering\RenderNode\PageRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyTranslations\Translation\Translator;

class PageService extends AbstractRenderNodeService
{
    public function __construct(
        AssetsService $assetsService,
        protected Translator $translator,
        protected RouterInterface $router
    )
    {
        parent::__construct(
            $assetsService,
        );
    }

    public function pageInit(
        RenderPass $renderPass,
        PageRenderNode $page,
        string $view
    ): void
    {
        $this->initRenderNode(
            $page,
            $renderPass,
            $view
        );

        $domain = $page->getContextType();
        $page->addTranslationDomain(
            $domain,
            $this->translator->setDomainFromTemplatePath(
                $domain,
                $view
            ),
            $view
        );
    }

    public function getControllerClassPathFromRouteName(string $routeName): string
    {
        return $this->router->getRouteCollection()->get($routeName)->getDefault('_controller');
    }

    public function pageTranslationPathFromRoute(string $route): string
    {
        $controllerMethodPath = $this->getControllerClassPathFromRouteName($route);
        /** @var AbstractLoaderController $controllerClass */
        $controllerClass = ClassHelper::getClassPath($controllerMethodPath);

        $bundle = null;
        if (ClassHelper::classUsesTrait($controllerClass, SymfonyDesignSystemBundleClassTrait::class)) {
            $bundle = $controllerClass::getBundleClassName();
        }

        $templateLocationPrefix = $controllerClass::getTemplateLocationPrefix(bundle: $bundle);

        if (ClassHelper::hasAttributes(
            $controllerMethodPath,
            SimpleMethodResolver::class
        )) {
            /** @var HasSimpleRoutesControllerTrait $classPath */
            $classPath = TextHelper::getFirstChunk(
                $controllerMethodPath,
                ClassHelper::METHOD_SEPARATOR,
            );

            $controllerRouteAttribute = $classPath::getControllerRouteAttribute();
            $controllerRouteName = $controllerRouteAttribute
                ? RouteHelper::getRouteAttributeName($controllerRouteAttribute)
                : null;

            if (!$controllerRouteName) {
                $controllerNamespaceParts = TemplateHelper::explodeControllerNamespaceSubParts(
                    $classPath,
                    $bundle
                );
                if (!empty($controllerNamespaceParts) && $controllerNamespaceParts[0] === 'Pages') {
                    $controllerNamespaceParts = array_slice($controllerNamespaceParts, 1);
                }

                $controllerRouteName = RouteHelper::buildRouteNameFromParts($controllerNamespaceParts, '');
            }

            if ($controllerRouteName !== '') {
                $methodAlias = TextHelper::removePrefix($route, $controllerRouteName);
            } else {
                $methodAlias = TextHelper::getLastChunk($route, '_');
            }

            /** @var string $classPath */
            $controllerMethodPath = ($classPath . ClassHelper::METHOD_SEPARATOR . TextHelper::toCamel($methodAlias));
        }

        return $this->buildTranslationPathFromClassPath(
            $controllerMethodPath,
            $templateLocationPrefix
        );
    }

    public function buildTranslationPathFromClassPath(
        string $classPath,
        string $templateLocationPrefix = null
    ): string
    {
        $controllerFullPath = ClassHelper::getClassPath($classPath);
        $methodName = ClassHelper::getMethodNameFromClassPath($classPath);

        // Remove useless namespace part.
        $controllerName = AbstractLoaderController::removeSuffix($controllerFullPath);

        /** @var AbstractPagesController $controllerFullPath */
        /** @var AbstractBundle $controllerBundle */
        if ($controllerFullPath::getControllerBundle()) {
            $explodeController = explode(
                ClassHelper::NAMESPACE_SEPARATOR,
                $controllerName
            );

            $explodeController = array_splice($explodeController, 3);

            // Append method name.
            $explodeController[] = $methodName;

            return $templateLocationPrefix . '.' . TemplateHelper::joinNormalizedParts(
                    $explodeController,
                    '.'
                );
        }
        // Remove useless namespace part.
        $controllerRelativePath = TextHelper::removePrefix(
            $controllerName,
            AbstractPagesController::NAMESPACE_CONTROLLER
        );

        // Cut parts.
        $explodeController = explode(
            ClassHelper::NAMESPACE_SEPARATOR,
            $controllerRelativePath
        );

        // Append method name.
        $explodeController[] = $methodName;

        return $templateLocationPrefix . '.' . TemplateHelper::joinNormalizedParts(
                $explodeController,
                '.'
            );
    }
}
