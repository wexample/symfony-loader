<?php

namespace Wexample\SymfonyLoader\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class TransJsExtension extends AbstractExtension
{
    public function __construct(
        protected AdaptiveResponseService $adaptiveResponseService,
        protected Translator $translator
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'trans_js',
                [
                    $this,
                    'transJs',
                ]
            ),
        ];
    }

    /**
     * Make translation available for javascript.
     */
    public function transJs(
        RenderPass $renderPass,
        string|array $keys
    ): void {
        $keys = is_string($keys) ? [$keys] : $keys;

        foreach ($keys as $key) {
            $renderPass
                ->getCurrentContextRenderNode()
                ->translations += $this->translator->transFilter($key);
        }
    }
}
