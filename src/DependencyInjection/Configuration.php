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
            ->defaultValue([])
            ->scalarPrototype()->end()
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
