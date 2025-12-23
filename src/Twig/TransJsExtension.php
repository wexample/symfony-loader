<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Service\AdaptiveResponseService;
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
