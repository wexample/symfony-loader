<?php

namespace Wexample\SymfonyLoader\Twig;

use Symfony\Component\HttpFoundation\RequestStack;
use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;

class AdaptiveResponseExtension extends AbstractExtension
{
    /**
     * CommonExtension constructor.
     */
    public function __construct(
        protected AdaptiveResponseService $adaptiveResponseService,
        protected RequestStack $requestStack,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'adaptive_response_rendering_base_path',
                [
                    $this,
                    'adaptiveResponseRenderingBasePath',
                ]
            ),
            new TwigFunction(
                'adaptive_response_standalone_uri',
                [
                    $this,
                    'adaptiveResponseStandaloneUri',
                ]
            ),
        ];
    }

    /**
     * Return base layout path regarding request type
     * and template configuration.
     */
    public function adaptiveResponseRenderingBasePath(
        RenderPass $renderPass,
    ): string {
        return $this->adaptiveResponseService->getLayoutBasePath(
            $renderPass,
        );
    }

    /**
     * Return the current uri without the query keys that only choose a shell,
     * for a link that opens the page on its own.
     */
    public function adaptiveResponseStandaloneUri(): string
    {
        return $this->adaptiveResponseService->getStandaloneUri(
            $this->requestStack->getCurrentRequest(),
        );
    }
}
