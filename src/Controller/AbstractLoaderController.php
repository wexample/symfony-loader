<?php

namespace Wexample\SymfonyLoader\Controller;


use Exception;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Twig\Environment;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyLoader\Exception\AssetsNotBuiltException;
use Wexample\SymfonyLoader\Helper\LoaderHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyLoader\Service\LayoutService;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

abstract class AbstractLoaderController extends \Wexample\SymfonyHelpers\Controller\AbstractController
{
    public function __construct(
        readonly protected AdaptiveResponseService $adaptiveResponseService,
        readonly protected LayoutService $layoutService,
        protected readonly KernelInterface $kernel
    )
    {
    }

    protected function createRenderPass(string $view): RenderPass
    {
        $renderPass = new RenderPass(
            view: $view,
            assetsRegistry: new AssetsRegistry(
                projectDir: $this->kernel->getProjectDir()
            )
        );

        /** @var ParameterBagInterface $parameterBag */
        $parameterBag = $this->container->get('parameter_bag');
        foreach (AssetsService::getAssetsUsagesStatic() as $usageStatic) {
            $usageName = $usageStatic::getName();
            $key = 'loader.usages.' . $usageName;

            $config = $parameterBag->has($key) ? $this->getParameter($key) : ['list' => []];
            $renderPass->usagesConfig[$usageName] = $config;

            $renderPass->setUsage(
                $usageName,
                $config['default'] ?? null
            );
        }

        $renderPass->enableAggregation = $this->getParameterOrDefault(
            'loader.enable_aggregation',
            false
        );

        $renderPass->setDebug(
            $this->getParameterOrDefault(
                'loader.debug',
                false
            )
        );

        $renderPass->setOutputType(
            $this->adaptiveResponseService->detectOutputType()
        );

        $renderPass->setLayoutBase(
            $this->adaptiveResponseService->detectLayoutBase($renderPass)
        );

        return $this->configureRenderPass($renderPass);
    }

    protected function configureRenderPass(
        RenderPass $renderPass
    ): RenderPass
    {
        return $renderPass;
    }

    /**
     * Overrides default render, adding some magic.
     * @throws Exception
     */
    protected function adaptiveRender(
        string $view,
        array $parameters = [],
        Response $response = null,
        RenderPass $renderPass = null
    ): Response
    {
        $renderPass = $renderPass ?: $this->createRenderPass($view);

        // Store it for post render events.
        $env = $this->getParameter('loader.environment');

        $renderPass->setView($view);

        if ($renderPass->isJsonRequest()) {
            $renderPass->setLayoutRenderNode(new AjaxLayoutRenderNode($env));

            $this->layoutService->initRenderNode(
                $renderPass->getLayoutRenderNode(),
                $renderPass,
                $view
            );

            try {
                $renderPasseResponse = $this->renderRenderPass(
                    $renderPass,
                    $parameters,
                    $response,
                );

                $renderPass->getLayoutRenderNode()->setBody(
                    trim($renderPasseResponse->getContent())
                );

                $finalResponse = new JsonResponse(
                    $renderPass->getLayoutRenderNode()->toRenderData());

                $finalResponse->setStatusCode(
                    $renderPasseResponse->getStatusCode()
                );

                // Prevents browser to display json response when
                // clicking on back button.
                $finalResponse->headers->set('Vary', 'Accept');

                return $finalResponse;
            } catch (\Exception $exception) {
                $errorView = BundleHelper::ALIAS_PREFIX .
                    WexampleSymfonyLoaderBundle::getAlias()
                    . '/' . AbstractPagesController::RESOURCES_DIR_PAGE
                    . 'system/error'
                    . TemplateHelper::TEMPLATE_FILE_EXTENSION;

                if ($view !== $errorView) {
                    $errorResponse = new JsonResponse();
                    $errorResponse->setStatusCode(Response::HTTP_INTERNAL_SERVER_ERROR);

                    return $this->adaptiveRender(
                        $errorView,
                        [
                            'exception' => $exception,
                        ],
                        $errorResponse
                    );
                }

                return new JsonResponse($exception->getMessage());
            }
        } else {
            $renderPass->setLayoutRenderNode(new InitialLayoutRenderNode($env));
        }

        return $this->renderRenderPass(
            $renderPass,
            $parameters + [
                'display_breakpoints' => $renderPass->getDisplayBreakpoints(),
            ],
            $response,
        );
    }

    /**
     * @throws Exception
     */
    public function renderRenderPass(
        RenderPass $renderPass,
        array $parameters = [],
        Response $response = null,
    ): Response
    {
        $view = $renderPass->getView();

        if (!$view) {
            throw new Exception('View must be defined before adaptive rendering');
        }

        $response = $this->render(
            $view,
            [
                'debug' => (bool) $this->getParameter('loader.debug'),
                'render_pass' => $renderPass,
            ] + $parameters,
            $response
        );

        return $this->injectLayoutAssets($response, $renderPass);
    }

    protected function injectLayoutAssets(
        Response $response,
        RenderPass $renderPass
    ): Response
    {
        if ($renderPass->isJsonRequest()
            || $response instanceof JsonResponse
            || $response->isEmpty()
            || $response->isRedirection()
            || $response->isClientError()
            || $response->isServerError()
        ) {
            return $response;
        }

        try {
            $content = $response->getContent();
        } catch (\LogicException) {
            return $response;
        }

        if (! $content || ! str_contains($content, RenderingHelper::PLACEHOLDER_PRELOAD_TAG)) {
            return $response;
        }

        if (! isset($this->container) || ! $this->container->has('twig')) {
            return $response;
        }

        /** @var Environment $twig */
        $twig = $this->container->get('twig');

        try {
            $assetsIncludes = $twig->render(
                '@WexampleSymfonyLoaderBundle/macros/assets.html.twig',
                [
                    'render_pass' => $renderPass,
                ]
            );
        } catch (\Throwable $exception) {
            $previous = $exception->getPrevious();
            $assetsException = null;
            if ($exception instanceof AssetsNotBuiltException) {
                $assetsException = $exception;
            } elseif ($previous instanceof AssetsNotBuiltException) {
                $assetsException = $previous;
            }

            if ($assetsException) {
                $content = $twig->render(
                    '@WexampleSymfonyLoaderBundle/system/fatal.html.twig',
                    [
                        'message' => $assetsException->getMessage(),
                        'hint' => $assetsException->getHint(),
                    ]
                );
                $response->setContent($content);

                return $response;
            }

            throw $exception;
        }

        $content = str_replace(
            RenderingHelper::PLACEHOLDER_PRELOAD_TAG,
            $assetsIncludes,
            $content
        );

        if ($renderPass->isDebug()) {
            $content .= $twig->render(
                '@WexampleSymfonyLoaderBundle/macros/debug.html.twig',
                [
                    'render_pass' => $renderPass,
                ]
            );
        }

        $response->setContent($content);

        return $response;
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
