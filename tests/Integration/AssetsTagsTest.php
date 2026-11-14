<?php

declare(strict_types=1);

namespace Wexample\SymfonyLoader\Tests\Integration;

use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\AssetTag;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

/**
 * The slots the head is built from. The assets macro walks them in this
 * nesting and the front end's AssetsService finds a slot by the names given
 * here — the marker and the placeholder id both read type-usage-context — so
 * a change on one side only leaves dynamic assets landing at random.
 */
class AssetsTagsTest extends AbstractSymfonyKernelTestCase
{
    private function buildTags(): array
    {
        self::bootKernel();
        $container = self::getContainer();

        $renderPass = $container->get(AdaptiveRendererService::class)
            ->createRenderPass('@front/pages/test-page.html.twig');

        return $container->get(AssetsService::class)->buildTags($renderPass);
    }

    public function testTagsAreNestedTypeContextUsage(): void
    {
        $tags = $this->buildTags();
        $usageNames = array_keys(self::getContainer()->get(AssetsService::class)->getAssetsUsages());

        $this->assertSame(Asset::CONTEXTS, array_keys($tags[Asset::EXTENSION_CSS]));

        foreach (Asset::CONTEXTS as $context) {
            $this->assertSame($usageNames, array_keys($tags[Asset::EXTENSION_CSS][$context]));
        }
    }

    public function testAnEmptySlotHoldsAPlaceholderNamedTypeUsageContext(): void
    {
        $tags = $this->buildTags();

        // Nothing rendered yet: every slot is a placeholder.
        foreach ([Asset::EXTENSION_CSS, Asset::EXTENSION_JS] as $type) {
            foreach (Asset::CONTEXTS as $context) {
                foreach ($tags[$type][$context] as $usageName => $slot) {
                    $this->assertCount(1, $slot);
                    /** @var AssetTag $tag */
                    $tag = $slot[0];

                    $this->assertSame($type.'-'.$usageName.'-'.$context.'-placeholder', $tag->getId());
                    $this->assertSame($usageName, $tag->getUsageName());
                    $this->assertSame($context, $tag->getContext());
                    $this->assertNull($tag->getPath());
                }
            }
        }
    }

    public function testTheRuntimeComesFirstUnderTheSameNesting(): void
    {
        $tags = $this->buildTags();

        $this->assertSame('extra', array_key_first($tags[Asset::EXTENSION_JS]));
        $this->assertSame(['runtime'], array_keys($tags[Asset::EXTENSION_JS]['extra']));
        $this->assertSame('javascript-runtime', $tags[Asset::EXTENSION_JS]['extra']['runtime'][0]->getId());
    }
}
