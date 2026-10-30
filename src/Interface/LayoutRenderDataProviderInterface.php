<?php

namespace Wexample\SymfonyLoader\Interface;

/**
 * What a bundle adds to the render data of every layout, by key, for its
 * own scripts to read in the page (`appRegistry.layoutRenderData`): a
 * service implementing it is collected by LayoutService, tagged by the
 * loader. A key the layout already writes is the layout's.
 */
interface LayoutRenderDataProviderInterface
{
    public const string TAG = 'wexample_symfony_loader.layout_render_data_provider';

    /**
     * @return array<string, mixed>
     */
    public function provideLayoutRenderData(): array;
}
