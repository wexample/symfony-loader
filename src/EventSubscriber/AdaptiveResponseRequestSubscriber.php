<?php

namespace Wexample\SymfonyLoader\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;

class AdaptiveResponseRequestSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly AdaptiveResponseService $adaptiveResponseService
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onRequest', 100],
            KernelEvents::RESPONSE => 'onResponse',
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        $this->adaptiveResponseService->initializeRequestAttributes($request);
    }

    public function onResponse(ResponseEvent $event): void
    {
        $this->adaptiveResponseService->keepShellOnRedirect($event->getRequest(), $event->getResponse());
    }
}
