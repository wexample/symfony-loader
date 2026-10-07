<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Tests\Traits\LoaderHttpTestTrait;

/**
 * The page an error is answered with. Asked here through `/_error/{code}`,
 * which is how an application looks at it and the one request that asks for
 * the page while the kernel is in debug — a real exception there is still
 * answered with its stack trace.
 */
class ErrorPageTest extends WebTestCase
{
    use LoaderHttpTestTrait;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testAnErrorIsAWholePageWithItsStatus(): void
    {
        $html = $this->requestPage('/_error/404');

        $this->assertResponseStatusCodeSame(404);
        $this->assertResponseHeaderSame('Content-Type', 'text/html; charset=UTF-8');
        $this->assertStringContainsString('<!DOCTYPE html>', $html);
        $this->assertStringContainsString('<title>This page does not exist</title>', $html);
        $this->assertStringContainsString('<p class="system-error--code">404</p>', $html);
    }

    /**
     * The regression this page was unusable for: assets were skipped on any
     * error status, so the document kept the placeholder the stylesheets are
     * written into and arrived with none of them.
     */
    public function testAnErrorPageIsServedItsAssets(): void
    {
        $html = $this->requestPage('/_error/500');

        $this->assertResponseStatusCodeSame(500);
        $this->assertStringContainsString('<p class="system-error--code">500</p>', $html);
        $this->assertStringNotContainsString(
            RenderingHelper::PLACEHOLDER_PRELOAD_TAG,
            $html
        );
    }

    public function testEachCodeHasItsOwnWording(): void
    {
        $this->assertStringContainsString(
            'Please sign in',
            $this->requestPage('/_error/401')
        );
        $this->assertStringContainsString(
            'This page is not yours to open',
            $this->requestPage('/_error/403')
        );
    }

    /**
     * A status the loader has no wording of its own for still reads as a page,
     * rather than falling through to nothing.
     */
    public function testAnUnnamedCodeKeepsTheGenericWording(): void
    {
        $html = $this->requestPage('/_error/418');

        $this->assertStringContainsString('This page cannot be shown', $html);
        $this->assertStringContainsString('<p class="system-error--code">418</p>', $html);
    }

    /**
     * A page the application holds for a status comes before the bundle's.
     */
    public function testTheApplicationsOwnPageForACodeWins(): void
    {
        $html = $this->requestPage('/_error/503');

        $this->assertResponseStatusCodeSame(503);
        $this->assertStringContainsString('<div>THE APPLICATION SAYS 503</div>', $html);
    }

    /**
     * The exception itself is still what a developer is shown: the page is for
     * whoever is reading the application, and hiding a stack trace behind it in
     * development would be the worse trade.
     */
    public function testADebugKernelStillAnswersARealExceptionWithIt(): void
    {
        $html = $this->requestPage('/page/broken');

        $this->assertResponseStatusCodeSame(500);
        // The markup, not the class name alone: Symfony's exception page quotes
        // the source of this very file, so every bare string written here is
        // found in it — escaped, which the tags below are not.
        $this->assertStringNotContainsString('<p class="system-error--code">', $html);
        $this->assertStringContainsString('variable_the_controller_never_passed', $html);
    }

    /**
     * An XHR gets the error as the render envelope it expects — `responseType`
     * says `render`, which is what tells the front-end to show the page
     * instead of reporting a request that failed.
     */
    public function testAnXhrGetsTheErrorAsARenderEnvelope(): void
    {
        $payload = $this->requestJson('/_error/404?__layout=default');

        $this->assertResponseStatusCodeSame(404);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertSame('render', $payload['responseType']);
        $this->assertStringContainsString('system-error--code', $payload['body']);
    }
}
