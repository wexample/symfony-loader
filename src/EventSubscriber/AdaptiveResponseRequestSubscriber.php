<?php

namespace Wexample\SymfonyLoader\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
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
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        $request->attributes->set(
            AdaptiveResponseService::REQUEST_ATTR_OUTPUT_TYPE,
            $this->adaptiveResponseService->getOutputType()
        );
        $request->attributes->set(
            AdaptiveResponseService::REQUEST_ATTR_LAYOUT_BASE,
            $this->adaptiveResponseService->getLayoutBase()
        );
    }
}
