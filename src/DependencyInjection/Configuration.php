<?php

namespace Wexample\SymfonyDesignSystem\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('wexample_symfony_design_system');

        $treeBuilder->getRootNode()
            ->children()
            ->arrayNode('front_paths')
            ->scalarPrototype()->end()
            ->end()
            ->end();

        return $treeBuilder;
    }
}
