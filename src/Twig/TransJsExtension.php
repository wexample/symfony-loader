<?php

namespace Wexample\SymfonyLoader\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use LogicException;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTranslations\Translation\Translator;

class TransJsExtension extends AbstractExtension
{
    public function __construct(
        protected readonly Translator $translator
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
        $renderNode = $renderPass->getCurrentContextRenderNode();

        // The words go to the page, layout or component being drawn; called
        // outside of one, there is nowhere to send them.
        if (! $renderNode) {
            throw new LogicException(
                'trans_js() needs a page, layout or component being rendered to give "'.implode('", "', $keys).'" to.'
            );
        }

        foreach ($keys as $key) {
            $renderNode->translations += $this->translator->transFilter($key);
        }
    }
}
