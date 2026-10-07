<?php

namespace Wexample\SymfonyLoader\Controller\System;

use Symfony\Component\ErrorHandler\ErrorRenderer\ErrorRendererInterface;
use Symfony\Component\ErrorHandler\Exception\FlattenException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Throwable;
use Twig\Environment;
use Wexample\SymfonyLoader\Controller\AbstractLoaderController;
use Wexample\SymfonyLoader\Helper\ErrorPageHelper;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;

/**
 * The page an error is answered with, rendered through the loader like any
 * other page: a browser gets a whole document with the stylesheets of the
 * page, an XHR gets the render envelope its front-end already knows how to
 * show.
 *
 * The bundle points `framework.error_controller` here, so this is reached both
 * by Symfony's error listener, on a real exception, and by the `/_error/{code}`
 * preview route.
 */
class ErrorController extends AbstractLoaderController
{
    public function __construct(
        AdaptiveRendererService $adaptiveRendererService,
        private readonly ErrorRendererInterface $errorRenderer,
        private readonly Environment $twig,
        private readonly KernelInterface $kernel,
    ) {
        parent::__construct($adaptiveRendererService);
    }

    public function __invoke(
        Request $request,
        Throwable $exception
    ): Response {
        $flatten = FlattenException::createFromThrowable($exception);

        if ($this->showsTheExceptionItself($request)) {
            return new Response(
                $this->errorRenderer->render($exception)->getAsString(),
                $flatten->getStatusCode(),
                $flatten->getHeaders()
            );
        }

        $statusCode = $flatten->getStatusCode();

        return $this->adaptiveRender(
            $this->resolveView($statusCode),
            [
                'status_code' => $statusCode,
                'status_text' => $flatten->getStatusText(),
                'exception' => $flatten,
            ],
            new Response('', $statusCode, $flatten->getHeaders())
        );
    }

    /**
     * Whether the developer is owed the exception rather than the page: the
     * same rule Symfony's own Twig renderer applies, so the stack trace keeps
     * showing in development and `/_error/{code}`, which asks for the page,
     * shows the page there too.
     */
    private function showsTheExceptionItself(Request $request): bool
    {
        return $this->kernel->isDebug()
            && $request->attributes->getBoolean('showException', true);
    }

    /**
     * The first template that exists among the four the application and the
     * bundle may hold for this status: the application's own page for the code,
     * its generic one, then the bundle's.
     */
    private function resolveView(int $statusCode): string
    {
        $loader = $this->twig->getLoader();

        foreach (ErrorPageHelper::viewCandidates($statusCode) as $view) {
            if ($loader->exists($view)) {
                return $view;
            }
        }

        return ErrorPageHelper::bundleView();
    }
}
