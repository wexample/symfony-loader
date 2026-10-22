<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Wexample\SymfonyLoader\Tests\Traits\LoaderHttpTestTrait;

/**
 * A page opened in the browser: the whole document, with the data the
 * front-end boots from and the stylesheets it needs before its first paint.
 */
class HtmlPageTest extends WebTestCase
{
    use LoaderHttpTestTrait;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testAPageIsAWholeDocument(): void
    {
        $html = $this->requestPage('/page');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'text/html; charset=UTF-8');
        $this->assertStringContainsString('<!DOCTYPE html>', $html);
        $this->assertStringContainsString('<html lang="en"', $html);
        $this->assertStringContainsString('<link rel="canonical" href="http://localhost/page">', $html);
        $this->assertStringContainsString('<main class="page"><div>TEST PAGE</div></main>', $html);
    }

    public function testTheRenderDataDescribesTheLayoutAndItsPage(): void
    {
        $data = $this->layoutRenderData($this->requestPage('/page'));

        $this->assertSame('layout', $data['contextType']);
        $this->assertSame('@WexampleSymfonyLoaderBundle/layouts/default/layout', $data['view']);
        $this->assertSame('page', $data['page']['contextType']);
        $this->assertSame('@front/pages/test-page', $data['page']['view']);
        $this->assertTrue($data['page']['isInitialPage']);
        $this->assertNotSame($data['id'], $data['page']['id']);
    }

    /**
     * The usages start on the defaults of the configuration, and the front-end
     * receives the whole list so it can offer the others.
     */
    public function testUsagesStartOnTheirConfiguredDefaults(): void
    {
        $data = $this->layoutRenderData($this->requestPage('/page'));

        $this->assertSame('default', $data['usages']['color_scheme']);
        $this->assertSame('basic', $data['usages']['skin']);
        $this->assertSame('system', $data['usages']['fonts']);
        $this->assertArrayHasKey('dark', $data['vars']['usagesConfig']['color_scheme']['list']);
    }

    /**
     * The page stylesheet is linked by the server so the first paint is
     * styled; the dark variant is not the active scheme, so it is only listed
     * for the front-end and its slot stays a placeholder.
     */
    public function testOnlyTheActiveStylesheetsAreLinkedByTheServer(): void
    {
        $html = $this->requestPage('/page');

        $this->assertStringContainsString('<link id="css-front-css-pages-test-page" rel="stylesheet"', $html);
        $this->assertStringNotContainsString('id="css-front-css-pages-test-page-color-scheme-dark"', $html);
        $this->assertStringContainsString('id="css-color_scheme-page-placeholder"', $html);

        $assets = $this->assetsByUsage($this->layoutRenderData($html)['page']['assets']['css']);
        $this->assertTrue($assets['default']['initialLayout']);
        $this->assertFalse($assets['color_scheme']['initialLayout']);
        $this->assertSame('build/@front/css/pages/test-page.0a1b2c.css', $assets['default']['publicPath']);
    }

    public function testASavedColorSchemeIsAppliedFromTheFirstPaint(): void
    {
        $this->saveUiState('color_scheme', 'dark');

        $html = $this->requestPage('/page');

        $this->assertSame('dark', $this->layoutRenderData($html)['usages']['color_scheme']);
        $this->assertStringContainsString('<link id="css-front-css-pages-test-page-color-scheme-dark" rel="stylesheet"', $html);
    }

    /**
     * A value saved before the configuration dropped it, or forged, must not
     * reach the front-end, which would ask for a stylesheet that is not built.
     */
    public function testASavedValueTheConfigurationDoesNotDeclareIsIgnored(): void
    {
        $this->saveUiState('color_scheme', 'neon');

        $data = $this->layoutRenderData($this->requestPage('/page'));

        $this->assertSame('default', $data['usages']['color_scheme']);
    }

    /**
     * Twig refuses a new global once it has rendered anything, so a global
     * the loader adds while rendering the page must already be declared.
     */
    public function testAPageRenderedAfterAnotherTemplateIsWhole(): void
    {
        $html = $this->requestPage('/page/after-mail');

        $this->assertResponseIsSuccessful();
        $this->assertStringContainsString('<main class="page"><div>TEST PAGE</div></main>', $html);
        $this->assertSame('@front/pages/test-page', $this->layoutRenderData($html)['page']['view']);
    }

    public function testAPageThatFailsToRenderAnswersAServerError(): void
    {
        $this->requestPage('/page/broken');

        $this->assertResponseStatusCodeSame(500);
    }

    private function assetsByUsage(array $assets): array
    {
        return array_column($assets, null, 'usage');
    }
}
