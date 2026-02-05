<?php

namespace Wexample\SymfonyLoader\DependencyInjection\Traits;

use Symfony\Component\DependencyInjection\ContainerBuilder;

trait WithLoaderConfigurationExtensionTrait
{
    protected function prependLoaderConfig(
        ContainerBuilder $container,
        array $config
    ): void {
        $container->prependExtensionConfig('wexample_symfony_loader', $config);
    }

    protected function prependLoaderLayoutBases(
        ContainerBuilder $container,
        array $layoutBases
    ): void {
        if (empty($layoutBases)) {
            return;
        }

        $this->prependLoaderConfig(
            $container,
            [
                'layout_bases' => $layoutBases,
            ]
        );
    }

    protected function normalizeLoaderLayoutBases(
        array $layoutBases
    ): array {
        foreach ($layoutBases as $base => $config) {
            if (!is_array($config)) {
                continue;
            }

            $component = $config['page_manager_component'] ?? null;
            if (is_string($component) && $component !== '' && !str_starts_with($component, '@@')) {
                $layoutBases[$base]['page_manager_component'] = '@@' . ltrim($component, '@');
            }
        }

        return $layoutBases;
    }
}
