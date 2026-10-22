<?php

namespace Wexample\SymfonyLoader\Twig;

use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Twig\Extension\GlobalsInterface;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

/**
 * Declares the globals AdaptiveRendererService sets while rendering a page.
 *
 * Twig refuses a new global once it has rendered anything — a mail sent by the
 * controller before it answers is enough — and only accepts updating one it
 * already knows. Declared here, they exist before any rendering.
 */
class RenderPassGlobalsExtension extends AbstractExtension implements GlobalsInterface
{
    public const string GLOBAL_RENDER_PASS = 'render_pass';

    public const string GLOBAL_DEBUG = 'debug';

    public function __construct(
        private readonly ParameterBagInterface $parameterBag,
    ) {
    }

    public function getGlobals(): array
    {
        return [
            self::GLOBAL_RENDER_PASS => null,
            self::GLOBAL_DEBUG => $this->parameterBag->has('loader.debug')
                && $this->parameterBag->get('loader.debug'),
        ];
    }
}
