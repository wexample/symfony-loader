<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Twig\Environment;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyLoader\Controller\AbstractPagesController;
use Wexample\SymfonyLoader\Exception\AssetsNotBuiltException;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

class AdaptiveRendererService
{
    public function __construct(
        private readonly AdaptiveResponseService $adaptiveResponseService,
        private readonly LayoutService $layoutService,
        private readonly KernelInterface $kernel,
        private readonly ParameterBagInterface $parameterBag,
        private readonly Environment $twig,
    ) {
    }

    public function createRenderPass(
        string $view,
        ?callable $configurator = null
    ): RenderPass {
        $renderPass = new RenderPass(
            view: $view,
            assetsRegistry: new AssetsRegistry(
                projectDir: $this->kernel->getProjectDir()
            )
        );

        foreach (AssetsService::getAssetsUsagesStatic() as $usageStatic) {
            $usageName = $usageStatic::getName();
            $key = 'loader.usages.' . $usageName;
            $config = $this->parameterBag->has($key)
                ? (array) $this->parameterBag->get($key)
                : ['list' => []];
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

        if ($configurator) {
            $configured = $configurator($renderPass);
            return $configured instanceof RenderPass ? $configured : $renderPass;
        }

        return $renderPass;
    }

    /**
     * @throws Exception
     */
    public function adaptiveRender(
        string $view,
        array $parameters = [],
        Response $response = null,
        RenderPass $renderPass = null,
        ?callable $configurator = null
    ): Response {
        $renderPass = $renderPass ?: $this->createRenderPass($view, $configurator);
        $env = (string) $this->getParameterOrDefault('loader.environment', 'dev');

        $renderPass->setView($view);

        if ($renderPass->isJsonRequest()) {
            $renderPass->setLayoutRenderNode(new AjaxLayoutRenderNode($env));

            $this->layoutService->initRenderNode(
                $renderPass->getLayoutRenderNode(),
                $renderPass,
                $view
            );

            try {
                $renderPassResponse = $this->renderRenderPass(
                    $renderPass,
                    $parameters,
                    $response
                );

                $renderPass->getLayoutRenderNode()->setBody(
                    trim($renderPassResponse->getContent())
                );

                $finalResponse = new JsonResponse(
                    $renderPass->getLayoutRenderNode()->toRenderData()
                );
                $finalResponse->setStatusCode(
                    $renderPassResponse->getStatusCode()
                );
                $finalResponse->headers->set('Vary', 'Accept');

                return $finalResponse;
            } catch (Exception $exception) {
                $errorView = BundleHelper::ALIAS_PREFIX .
                    WexampleSymfonyLoaderBundle::getAlias() . '/' .
                    AbstractPagesController::RESOURCES_DIR_PAGE .
                    'system/error' .
                    TemplateHelper::TEMPLATE_FILE_EXTENSION;

                if ($view !== $errorView) {
                    $errorResponse = new JsonResponse();
                    $errorResponse->setStatusCode(Response::HTTP_INTERNAL_SERVER_ERROR);

                    return $this->adaptiveRender(
                        $errorView,
                        [
                            'exception' => $exception,
                        ],
                        $errorResponse,
                        null,
                        $configurator
                    );
                }

                return new JsonResponse($exception->getMessage());
            }
        }

        $renderPass->setLayoutRenderNode(new InitialLayoutRenderNode($env));

        return $this->renderRenderPass(
            $renderPass,
            $parameters + [
                'display_breakpoints' => $renderPass->getDisplayBreakpoints(),
            ],
            $response
        );
    }

    /**
     * @throws Exception
     */
    public function renderRenderPass(
        RenderPass $renderPass,
        array $parameters = [],
        Response $response = null,
    ): Response {
        $view = $renderPass->getView();

        if (!$view) {
            throw new Exception('View must be defined before adaptive rendering');
        }

        $this->twig->addGlobal('render_pass', $renderPass);
        $this->twig->addGlobal('debug', (bool) $this->getParameterOrDefault('loader.debug', false));

        $content = $this->twig->render(
            $view,
            $parameters
        );

        $response ??= new Response();
        $response->setContent($content);

        return $this->injectLayoutAssets($response, $renderPass);
    }

    public function injectLayoutAssets(
        Response $response,
        RenderPass $renderPass
    ): Response {
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

        if (!$content || !str_contains($content, RenderingHelper::PLACEHOLDER_PRELOAD_TAG)) {
            return $response;
        }

        try {
            $assetsIncludes = $this->twig->render(
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
                $content = $this->twig->render(
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
            $content .= $this->twig->render(
                '@WexampleSymfonyLoaderBundle/macros/debug.html.twig',
                [
                    'render_pass' => $renderPass,
                ]
            );
        }

        $response->setContent($content);

        return $response;
    }

    private function getParameterOrDefault(string $key, mixed $default): mixed
    {
        return $this->parameterBag->has($key) ? $this->parameterBag->get($key) : $default;
    }
}
