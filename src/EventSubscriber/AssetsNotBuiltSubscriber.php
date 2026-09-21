<?php

namespace Wexample\SymfonyLoader\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Twig\Environment;
use Wexample\SymfonyLoader\Exception\AssetsNotBuiltException;

/**
 * A build that is missing or not finished is one state for whoever is looking
 * at the page, whichever render tripped over it: the layout, a component, an
 * embed. Handled here, once, at the kernel, rather than by a catch around each
 * render that touches an asset — the first of those catches lives in
 * AdaptiveRendererService, and the second would have been a copy of it.
 */
class AssetsNotBuiltSubscriber implements EventSubscriberInterface
{
    private const TEMPLATE = '@WexampleSymfonyLoaderBundle/system/fatal.html.twig';

    public function __construct(
        private readonly Environment $twig,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => 'onException',
        ];
    }

    public function onException(ExceptionEvent $event): void
    {
        $exception = self::findAssetsNotBuilt($event->getThrowable());

        if (! $exception) {
            return;
        }

        $event->setResponse(new Response(
            $this->twig->render(self::TEMPLATE, ['message' => $exception->getMessage()]),
            Response::HTTP_SERVICE_UNAVAILABLE,
            // Said to the browser too: a build in progress is over in a minute,
            // and a page that says so is worth asking for again.
            ['Retry-After' => '30'],
        ));
    }

    /**
     * Twig wraps what a template throws, sometimes twice: the chain is walked
     * rather than only the first previous looked at.
     */
    private static function findAssetsNotBuilt(\Throwable $throwable): ?AssetsNotBuiltException
    {
        for ($current = $throwable; $current; $current = $current->getPrevious()) {
            if ($current instanceof AssetsNotBuiltException) {
                return $current;
            }
        }

        return null;
    }
}
