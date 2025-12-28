<?php

namespace Wexample\SymfonyLoader\Controller;

use Exception;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Wexample\SymfonyLoader\Helper\LoaderHelper;
use Wexample\SymfonyLoader\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyLoader\Service\LayoutService;
use Wexample\SymfonyLoader\Service\RenderPassBagService;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

abstract class AbstractLoaderController extends \Wexample\SymfonyHelpers\Controller\AbstractController
{
    public function __construct(
        readonly protected AdaptiveResponseService $adaptiveResponseService,
        readonly protected LayoutService $layoutService,
        readonly protected RenderPassBagService $renderPassBagService,
    )
    {
    }

    protected function createRenderPass(): RenderPass
    {
        $renderPass = new RenderPass();

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
        $renderPass = $renderPass ?: $this->createRenderPass();

        // Store it for post render events.
        $this->renderPassBagService->setRenderPass($renderPass);
        $env = $this->getParameter('loader.environment');

        $renderPass->setView($view);

        if ($renderPass->isJsonRequest()) {
            $renderPass->layoutRenderNode = new AjaxLayoutRenderNode($env);

            $this->layoutService->initRenderNode(
                $renderPass->layoutRenderNode,
                $renderPass,
                $view
            );

            try {
                $renderPasseResponse = $this->renderRenderPass(
                    $renderPass,
                    $parameters,
                    $response,
                );

                $renderPass->layoutRenderNode->setBody(
                    trim($renderPasseResponse->getContent())
                );

                $finalResponse = new JsonResponse(
                    $renderPass->layoutRenderNode->toRenderData());

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
            $renderPass->layoutRenderNode = new InitialLayoutRenderNode($env);
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

        return $this->render(
            $view,
            [
                'debug' => (bool) $this->getParameter('loader.debug'),
                'render_pass' => $renderPass,
            ] + $parameters,
            $response
        );
    }

    /**
     * @return string Allow bundle-specific front template directories.
     */
    public static function getTemplateLocationPrefix(
        AbstractBundle|string $bundle = null
    ): string
    {
        $bundleClass = $bundle ?: static::getControllerBundle();
        return ($bundle ? $bundle::getAlias() : LoaderHelper::TWIG_NAMESPACE_FRONT);
    }

    public static function getControllerTemplateDir(): string
    {
        return TemplateHelper::joinNormalizedParts(
            [
                self::getTemplateLocationPrefix(),
                ...TemplateHelper::explodeControllerNamespaceSubParts(static::class),
            ]
        );
    }
}
