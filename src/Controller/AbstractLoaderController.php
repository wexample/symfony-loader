<?php

namespace Wexample\SymfonyLoader\Controller;


use Exception;
use Symfony\Component\HttpFoundation\Response;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Controller\AbstractController;
use Wexample\SymfonyLoader\Helper\LoaderHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

abstract class AbstractLoaderController extends AbstractController
{
    public function __construct(
        protected readonly AdaptiveRendererService $adaptiveRendererService,
    )
    {
    }

    /**
     * Overrides default render, adding some magic.
     * @throws Exception
     */
    public function adaptiveRender(
        string $view,
        array $parameters = [],
        Response $response = null,
        RenderPass $renderPass = null
    ): Response
    {
        return $this->adaptiveRendererService->adaptiveRender(
            $view,
            $parameters,
            $response,
            $renderPass,
            function (RenderPass $renderPass): RenderPass {
                return $this->configureRenderPass($renderPass);
            }
        );
    }

    protected function configureRenderPass(
        RenderPass $renderPass
    ): RenderPass
    {
        return $renderPass;
    }

    /**
     * @return string Allow bundle-specific front template directories.
     */
    public static function getTemplateLocationPrefix(
        AbstractBundle|string $bundle = null
    ): string
    {
        $bundle = $bundle ?: static::getControllerBundle();
        return ($bundle ? $bundle::getAlias() : LoaderHelper::TWIG_NAMESPACE_FRONT);
    }

    public static function getTemplateFrontDir(
        AbstractBundle|string $bundle = null
    ): string
    {
        return ($bundle ? LoaderHelper::TWIG_NAMESPACE_ASSETS : LoaderHelper::TWIG_NAMESPACE_FRONT);
    }

    /**
     * Based on the controller name, find the matching template dir.
     * The controller and its templates should follow the same directories structure.
     * ex:
     *   - Config/Loader/AppController.php
     *   - config/loader/app/(index.html.twig)
     */
    public static function getControllerTemplateDir(
        string $bundle = null
    ): string
    {
        return TemplateHelper::joinNormalizedParts(
            [
                self::getTemplateLocationPrefix(),
                ...TemplateHelper::explodeControllerNamespaceSubParts(
                    controllerName: static::class,
                    bundleClassPath: $bundle
                ),
            ]
        );
    }
}
