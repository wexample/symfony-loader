<?php

namespace Wexample\SymfonyLoader\Controller\System;

use Symfony\Component\ErrorHandler\ErrorRenderer\ErrorRendererInterface;
use Symfony\Component\ErrorHandler\Exception\FlattenException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Contracts\Translation\TranslatorInterface;
use Throwable;
use Twig\Environment;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyLoader\Controller\AbstractLoaderController;
use Wexample\SymfonyLoader\Helper\ErrorPageHelper;
use Wexample\SymfonyLoader\Helper\FallbackPageHelper;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;
use Wexample\SymfonyTranslations\Translation\Translator;

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
        private readonly TranslatorInterface $translator,
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
        $view = $this->resolveView($statusCode);

        // The bundle's page stands in a layout of the bundle, which no
        // application builds the assets of: opened as a whole document, it
        // would come without a stylesheet. The page that needs none says the
        // same instead, in the visitor's language. Fetched by a page already
        // open, it is drawn in that page's layout, styled.
        if (ErrorPageHelper::isBundleView($view) && ! $this->createRenderPass($view)->isJsonRequest()) {
            return new Response(
                $this->twig->render(FallbackPageHelper::TEMPLATE, $this->translateError($statusCode, $view, $request)),
                $statusCode,
                $flatten->getHeaders()
            );
        }

        try {
            return $this->adaptiveRender(
                $view,
                [
                    'status_code' => $statusCode,
                    'status_text' => $flatten->getStatusText(),
                    'exception' => $flatten,
                ],
                new Response('', $statusCode, $flatten->getHeaders())
            );
        } catch (Throwable) {
            // The error page could not be drawn — its layout broken by what
            // broke the page, say. The page that needs nothing is shown
            // instead of Symfony's own, the same the application shows when it
            // cannot answer at all.
            return new Response(
                $this->twig->render(FallbackPageHelper::TEMPLATE, FallbackPageHelper::error($statusCode)),
                $statusCode,
                $flatten->getHeaders()
            );
        }
    }

    /**
     * The fallback page's error, worded as the bundle's page words it, in
     * the request's language, with its way out.
     *
     * @return array<string, mixed>
     */
    private function translateError(int $statusCode, string $view, Request $request): array
    {
        $domain = Translator::buildDomainFromTemplatePath(substr($view, strlen(BundleHelper::ALIAS_PREFIX)));
        $key = in_array($statusCode, ErrorPageHelper::WORDED_CODES, true) ? (string) $statusCode : 'default';
        $locale = $request->getLocale();

        return [
            'status_code' => $statusCode,
            'title' => $this->translator->trans('code.'.$key.'.title', [], $domain, $locale),
            'message' => $this->translator->trans('code.'.$key.'.message', [], $domain, $locale),
            'exit' => ['href' => '/', 'label' => $this->translator->trans('exit', [], $domain, $locale)],
            'lang' => $locale,
        ];
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
