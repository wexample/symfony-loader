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
            ->arrayNode('front_paths')
            ->scalarPrototype()->end()
            ->end()
            ->end();

        return $treeBuilder;
    }
}
