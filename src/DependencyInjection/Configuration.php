<?php

namespace Wexample\SymfonyLoader\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('wexample_symfony_loader');

        $treeBuilder->getRootNode()
            ->children()
            ->scalarNode('tsconfig_path')
            ->defaultNull()
            ->end()
            ->scalarNode('default_color_scheme')
            ->defaultNull()
            ->end()
            ->arrayNode('front_paths')
            ->normalizeKeys(false)
            ->beforeNormalization()
            ->always(static function ($value) {
                if (!is_array($value)) {
                    return [];
                }

                $normalized = [];
                foreach ($value as $key => $item) {
                    $path = $item;
                    if (is_array($item)) {
                        $path = $item['path'] ?? null;
                    }

                    $normalized[$key] = $path;
                }

                return $normalized;
            })
            ->end()
            ->defaultValue([])
            ->useAttributeAsKey('alias')
            ->scalarPrototype()->cannotBeEmpty()->end()
            ->end()
            ->arrayNode('layout_bases')
            ->useAttributeAsKey('name')
            ->arrayPrototype()
            ->children()
            ->scalarNode('page_manager_component')
            ->defaultNull()
            ->end()
            ->end()
            ->end()
            ->defaultValue([])
            ->end()
            ->end();

        return $treeBuilder;
    }
}
