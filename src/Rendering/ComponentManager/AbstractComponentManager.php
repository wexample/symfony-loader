<?php

namespace Wexample\SymfonyDesignSystem\Rendering\ComponentManager;

use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyDesignSystem\Service\AdaptiveResponseService;

abstract class AbstractComponentManager
{
    public function __construct(
        protected KernelInterface $kernel,
        protected AdaptiveResponseService $adaptiveResponseService,
    ) {
    }

    public function createComponent(
        string $initMode,
        array $options = [],
    ): ?ComponentRenderNode {
        $parts = explode('\\', static::class);
        $name = end($parts);
        $componentParts = array_splice($parts, 0, -2);
        $componentParts[] = 'Component';
        $componentParts[] = TextHelper::trimLastChunk($name, 'ComponentManager');

        $className = implode('\\', $componentParts);

        if (class_exists($className)) {
            return new $className(
                $initMode,
                $options
            );
        }

        return null;
    }

    public function postRender()
    {
        // To override...
    }
}
