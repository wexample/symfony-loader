<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Wexample\SymfonyLoader\Tests\Traits\LoaderHttpTestTrait;

/**
 * A worker (FrankenPHP) keeps one kernel for many requests, its services
 * reset in between: a page must come out of it as it comes out of a fresh one,
 * with nothing of the pages served before. The browser kept from rebooting
 * goes through the same reset.
 */
class WorkerReuseTest extends WebTestCase
{
    use LoaderHttpTestTrait;

    public function testAPageServedAfterAnotherCarriesNothingOfIt(): void
    {
        $this->client = static::createClient();
        $fresh = $this->pageFootprint($this->requestPage('/page'));

        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->client->disableReboot();

        // Assets, vues and their translations of its own.
        $this->requestPage('/page/twice-the-same-vue');
        $reused = $this->pageFootprint($this->requestPage('/page'));

        $this->assertSame($fresh, $reused);
    }

    /**
     * What a page asks the browser for and what it hands to the front-end,
     * without the identifiers drawn anew at each render.
     */
    private function pageFootprint(string $html): array
    {
        preg_match_all('#<(?:script|link) id="([^"]+)"#', $html, $tags);
        $data = $this->layoutRenderData($html);

        return [
            'tags' => $tags[1],
            'assets' => array_keys($data['assetsRegistry'] ?? []),
            'vueTemplates' => array_keys($data['vueTemplates'] ?? []),
            'translations' => array_keys($data['translations'] ?? []),
        ];
    }
}
