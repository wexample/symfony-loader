<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Rendering;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\AssetTag;

class AssetTagTest extends TestCase
{
    public function testSetAssetPopulatesTagFields(): void
    {
        $asset = new Asset(
            'build/bundle/js/app.js',
            'usage',
            Asset::CONTEXT_PAGE
        );
        $asset->media = 'screen';

        $tag = new AssetTag();
        $tag->setUsageName('custom');
        $tag->setContext(Asset::CONTEXT_COMPONENT);
        $tag->setPath('build/override.js');
        $tag->setMedia('print');

        $tag->setAsset($asset);

        $this->assertSame($asset, $tag->getAsset());
        $this->assertSame($asset->getDomId(), $tag->getId());
        $this->assertSame($asset->path, $tag->getPath());
        $this->assertSame($asset->media, $tag->getMedia());
        $this->assertSame($asset->getUsage(), $tag->getUsageName());
        $this->assertSame($asset->getContext(), $tag->getContext());
    }
}
