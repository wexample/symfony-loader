<?php

namespace Wexample\SymfonyLoader\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Twig\Environment;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Service\RenderPassBagService;

class AssetsEventSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly Environment $twig,
        protected readonly RenderPassBagService $renderPassBagService
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => ['onKernelResponse', 0],
        ];
    }

    public function onKernelResponse(ResponseEvent $event)
    {
        $renderPass = $this->renderPassBagService->getRenderPass();

        // Support regular controllers
        $response = $event->getResponse();
        if ($renderPass
            && ! $renderPass->isJsonRequest()
            && ! $response->isServerError()
            && ! $response->isClientError()
        ) {
            $assetsIncludes = $this->twig->render(
                '@WexampleSymfonyLoaderBundle/macros/assets.html.twig',
                [
                    'render_pass' => $renderPass,
                ]
            );

            $content = str_replace(
                RenderingHelper::PLACEHOLDER_PRELOAD_TAG,
                $assetsIncludes,
                $response->getContent()
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
        }
    }
}
