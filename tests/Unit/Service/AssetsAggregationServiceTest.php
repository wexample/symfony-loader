<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\AssetTag;
use Wexample\SymfonyLoader\Service\AssetsAggregationService;

class AssetsAggregationServiceTest extends TestCase
{
    public function testBuildAggregatedTagsWritesAggregatedFile(): void
    {
        $tmp = sys_get_temp_dir().'/symfony-loader-agg-'.uniqid();
        $publicDir = $tmp.'/public';
        mkdir($publicDir.'/build', 0777, true);

        file_put_contents($publicDir.'/build/a.css', '/* a */');
        file_put_contents($publicDir.'/build/b.css', '/* b */');
        file_put_contents($publicDir.'/build/c.css', '/* c */');

        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($tmp);

        $service = new AssetsAggregationService($kernel);

        $aggTag1 = new AssetTag();
        $aggTag1->setPath('build/a.css');
        $aggTag1->setContext(Asset::CONTEXT_LAYOUT);
        $aggTag1->setUsageName('default');
        $aggTag1->setCanAggregate(true);

        $aggTag2 = new AssetTag();
        $aggTag2->setPath('build/b.css');
        $aggTag2->setContext(Asset::CONTEXT_LAYOUT);
        $aggTag2->setUsageName('default');
        $aggTag2->setCanAggregate(true);

        $nonAggTag = new AssetTag();
        $nonAggTag->setPath('build/c.css');
        $nonAggTag->setContext(Asset::CONTEXT_LAYOUT);
        $nonAggTag->setUsageName('default');
        $nonAggTag->setCanAggregate(false);

        $baseTags = [
            Asset::EXTENSION_CSS => [
                Asset::CONTEXT_LAYOUT => [
                    'default' => [$aggTag1, $aggTag2, $nonAggTag],
                ],
            ],
        ];

        $result = $service->buildAggregatedTags('bundle/view', $baseTags);

        $aggEntries = $result[Asset::EXTENSION_CSS][Asset::CONTEXT_LAYOUT]['default-agg'] ?? [];
        $this->assertNotEmpty($aggEntries);
        $aggregatedPath = $aggEntries[0]->getPath();
        $this->assertIsString($aggregatedPath);
        $this->assertStringStartsWith('build/bundle/view-0.agg.css?', $aggregatedPath);

        $pathWithoutHash = explode('?', $aggregatedPath)[0];
        $this->assertFileExists($publicDir.'/'.$pathWithoutHash);

        $defaultEntries = $result[Asset::EXTENSION_CSS][Asset::CONTEXT_LAYOUT]['default'] ?? [];
        $this->assertSame('build/c.css', $defaultEntries[0]->getPath());
    }

    public function testBuildAggregatedTagsKeepsPlaceholders(): void
    {
        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn(sys_get_temp_dir().'/symfony-loader-placeholder-'.uniqid());

        $service = new AssetsAggregationService($kernel);

        $placeholder = new AssetTag();
        $placeholder->setPath(null);
        $placeholder->setContext(Asset::CONTEXT_LAYOUT);
        $placeholder->setUsageName('default');

        $baseTags = [
            Asset::EXTENSION_CSS => [
                Asset::CONTEXT_LAYOUT => [
                    'default' => [$placeholder],
                ],
            ],
        ];

        $result = $service->buildAggregatedTags('bundle/view', $baseTags);

        $this->assertSame(
            $placeholder,
            $result[Asset::EXTENSION_CSS][Asset::CONTEXT_LAYOUT]['default'][0]
        );
    }
}

