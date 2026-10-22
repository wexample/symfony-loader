<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Wexample\SymfonyLoader\Tests\Traits\LoaderHttpTestTrait;

/**
 * A vue's template is rendered once per page, however many times the vue is
 * placed: every placement still needs the translations the template asked for.
 */
class VueTranslationsTest extends WebTestCase
{
    use LoaderHttpTestTrait;

    private const string VIEW = '@front/components/greeting/greeting';

    private const string CHILD_VIEW = '@front/components/greeting-child/greeting-child';

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testEachPlacementOfAVueGetsItsTranslations(): void
    {
        $payload = $this->requestJson('/page/twice-the-same-vue?__layout=default');

        $this->assertSame([self::CHILD_VIEW, self::VIEW], array_keys($payload['vueTemplates']));

        $roots = $payload['page']['components'];
        $this->assertCount(2, $roots);

        foreach ($roots as $root) {
            $this->assertSame(self::VIEW, $root['options']['name']);
            $this->assertSame('Hello', $root['translations']['front.components.greeting.greeting::hello'] ?? null);
            $this->assertSame('front.components.greeting.greeting', $root['translationDomains']['vue'][self::VIEW] ?? null);
        }
    }

    /**
     * A vue placed inside the template of another is rendered with it, once:
     * the next placements of the outer vue get its translations too.
     */
    public function testEachPlacementGetsTheTranslationsOfTheVuesInside(): void
    {
        $payload = $this->requestJson('/page/twice-the-same-vue?__layout=default');

        foreach ($payload['page']['components'] as $root) {
            $this->assertSame('Bye', $root['translations']['front.components.greeting-child.greeting-child::bye'] ?? null);
            $this->assertSame('front.components.greeting-child.greeting-child', $root['translationDomains']['vue'][self::CHILD_VIEW] ?? null);
        }
    }
}
