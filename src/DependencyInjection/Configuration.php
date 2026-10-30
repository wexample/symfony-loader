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
            // The developer's toolbar, and the tabs it loads, on every page of
            // a debug kernel. Asked for by an app that wants it — the design
            // system's showcase —, off everywhere else: a dozen scripts loaded
            // on each page is a dozen requests an application waits behind.
            ->booleanNode('develop_toolbar')
            ->defaultFalse()
            ->end()
            // Themes: named sets of axis values — skin, palette, fonts, density —
            // applied together and offered to the visitor (the design system's
            // theme_select()). Never the colour scheme: light or dark stays the
            // visitor's own, whatever the theme.
            ->arrayNode('themes')
            ->normalizeKeys(false)
            ->useAttributeAsKey('name')
            ->arrayPrototype()
            ->normalizeKeys(false)
            ->scalarPrototype()->end()
            ->validate()
            ->ifTrue(static fn (array $axes): bool => isset($axes['color_scheme']))
            ->thenInvalid('A theme never sets the colour scheme: light or dark is the visitor\'s choice, whatever the theme.')
            ->end()
            ->end()
            ->end()
            // Locale used to format dates, when it must differ from the translation one (e.g. en_GB).
            ->scalarNode('date_locale')
            ->defaultNull()
            ->end()
            ->arrayNode('front_paths')
            ->normalizeKeys(false)
            ->beforeNormalization()
            ->always(static function ($value) {
                if (! is_array($value)) {
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
