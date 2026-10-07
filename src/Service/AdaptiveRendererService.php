<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Twig\Environment;
use Wexample\SymfonyLoader\Exception\AssetsNotBuiltException;
use Wexample\SymfonyLoader\Helper\AdaptiveRequestHelper;
use Wexample\SymfonyLoader\Helper\ErrorPageHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Twig\RenderPassGlobalsExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class AdaptiveRendererService
{
    public function __construct(
        private readonly AdaptiveResponseService $adaptiveResponseService,
        private readonly DevelopToolbarRegistryService $developToolbarRegistry,
        private readonly LayoutService $layoutService,
        private readonly KernelInterface $kernel,
        private readonly ParameterBagInterface $parameterBag,
        private readonly Environment $twig,
        private readonly RequestStack $requestStack,
        private readonly Translator $translator,
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

        $renderPass->setDebug($this->kernel->isDebug());

        $renderPass->setDevelopToolbar(
            $this->kernel->isDebug()
            && $this->parameterBag->has('loader.develop_toolbar')
            && (bool) $this->parameterBag->get('loader.develop_toolbar')
        );

        if ($renderPass->isDevelopToolbar()) {
            $renderPass->developTabs = $this->developToolbarRegistry->toArray();
        }

        // Without a request (console, tests rendering through the pipeline),
        // the render pass keeps its own defaults: html output, default base.
        if ($request = $this->requestStack->getCurrentRequest()) {
            // A request the kernel did not dispatch never met the request subscriber.
            $this->adaptiveResponseService->initializeRequestAttributes($request);

            if ($request->hasSession()) {
                $session = $request->getSession();
                foreach (array_keys($renderPass->usagesConfig) as $usageName) {
                    $saved = $session->get('ui_state.ui.' . $usageName);
                    if ($saved !== null) {
                        $renderPass->setUsage($usageName, $saved);
                    }
                }
            }

            $renderPass->setOutputType(
                AdaptiveRequestHelper::getOutputType($request) ?? $renderPass->getOutputType()
            );

            $renderPass->setLayoutBase(
                AdaptiveRequestHelper::getLayoutBase($request) ?? $renderPass->getLayoutBase()
            );
        }

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
        ?Response $response = null,
        ?RenderPass $renderPass = null,
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

                $renderData = $renderPass->getLayoutRenderNode()->toRenderData();
                $renderArray = $renderData instanceof \Wexample\SymfonyLoader\Rendering\RenderData
                    ? $renderData->toArray()
                    : $renderData;

                $finalResponse = new JsonResponse($renderArray);
                $finalResponse->setStatusCode(
                    $renderPassResponse->getStatusCode()
                );
                $finalResponse->headers->set('Vary', 'Accept');

                return $finalResponse;
            } catch (Exception $exception) {
                $errorView = ErrorPageHelper::renderFailureView();

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
        ?Response $response = null,
    ): Response {
        $view = $renderPass->getView();

        if (! $view) {
            throw new Exception('View must be defined before adaptive rendering');
        }

        // Declared by RenderPassGlobalsExtension, so this only updates it,
        // whatever Twig rendered before.
        $this->twig->addGlobal(RenderPassGlobalsExtension::GLOBAL_RENDER_PASS, $renderPass);

        // The page's own words are reachable from its first line: a page
        // template runs what stands outside its blocks — `set page_title =
        // '@page::…'|trans` — before the layout it extends has registered the
        // page, and `@page::` would print as the raw key.
        $this->translator->setDomainFromTemplatePath(Translator::DOMAIN_TYPE_PAGE, $view);

        try {
            $content = $this->twig->render(
                $view,
                $parameters
            );
        } finally {
            $this->translator->revertDomain(Translator::DOMAIN_TYPE_PAGE);
        }

        $response ??= new Response();
        $response->setContent($content);

        return $this->injectLayoutAssets($response, $renderPass);
    }

    public function injectLayoutAssets(
        Response $response,
        RenderPass $renderPass
    ): Response {
        // An error status is not a reason to skip: a 404 answered with a page
        // is a page, and it needs its stylesheets as much as any other. What
        // decides is the placeholder below — a response the loader did not
        // render carries none, whatever its status.
        if ($renderPass->isJsonRequest()
            || $response instanceof JsonResponse
            || $response->isEmpty()
            || $response->isRedirection()
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

        $response->setContent($content);

        return $response;
    }

    private function getParameterOrDefault(string $key, mixed $default): mixed
    {
        return $this->parameterBag->has($key) ? $this->parameterBag->get($key) : $default;
    }
}
