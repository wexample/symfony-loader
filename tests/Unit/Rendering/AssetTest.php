<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Rendering;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\Asset;

class AssetTest extends TestCase
{
    public function testBuildsViewFromManifestPath(): void
    {
        $asset = new Asset(
            'build/bundle/css/view.css',
            'default',
            Asset::CONTEXT_LAYOUT
        );

        $this->assertSame('bundle/view', $asset->getView());
    }
}

