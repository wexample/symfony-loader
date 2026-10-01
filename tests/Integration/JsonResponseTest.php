<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Wexample\SymfonyLoader\Tests\Traits\LoaderHttpTestTrait;

/**
 * The same page asked by the front-end, to show it without reloading: a JSON
 * envelope carrying the page HTML and what the front-end needs to mount it.
 *
 * Every request names `__layout=default`: the other shells of the loader
 * (`modal`, the default for XHR, `panel`, `overlay`) draw icons through the
 * `icon()` function of a design system, which this package does not install.
 */
class JsonResponseTest extends WebTestCase
{
    use LoaderHttpTestTrait;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testAnXhrGetsTheJsonEnvelope(): void
    {
        $payload = $this->requestJson('/page?__layout=default');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertResponseHeaderSame('Vary', 'Accept');
        $this->assertTrue($payload['ok']);
        $this->assertSame('<div class="layout-default"><div>TEST PAGE</div></div>', $payload['body']);
        $this->assertSame('@front/pages/test-page', $payload['page']['view']);
    }

    public function testTheFormatQueryAsksForJsonWithoutXhr(): void
    {
        $payload = $this->requestJson('/page?__format=json&__layout=default', false);

        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertSame('@front/pages/test-page', $payload['page']['view']);
    }

    /**
     * The page is mounted into a document that is already there: it is not
     * the initial page, the layout re-sends no assets, and the page lists its
     * own without any of them having been linked by the server.
     */
    public function testThePageArrivesIntoAnExistingDocument(): void
    {
        $payload = $this->requestJson('/page?__layout=default');

        $this->assertFalse($payload['page']['isInitialPage']);
        $this->assertArrayNotHasKey('assets', $payload);
        $this->assertNotEmpty($payload['page']['assets']['css']);

        foreach ($payload['page']['assets']['css'] as $asset) {
            $this->assertFalse($asset['initialLayout'], $asset['path']);
        }
    }

    public function testARenderingErrorAnswersAServerErrorInJson(): void
    {
        $payload = $this->requestJson('/page/broken?__layout=default');

        $this->assertResponseStatusCodeSame(500);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertStringContainsString('variable_the_controller_never_passed', $payload['body']);
    }
}
