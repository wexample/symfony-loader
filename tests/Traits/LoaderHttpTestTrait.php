<?php

namespace Wexample\SymfonyLoader\Tests\Traits;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Component\BrowserKit\Cookie;
use Wexample\SymfonyTesting\Traits\Parsing\InlineJsonVarExtractorTrait;

/**
 * What every HTTP test of the loader needs: a browser, a session to seed, and
 * the render data the page hands to the front-end.
 */
trait LoaderHttpTestTrait
{
    use InlineJsonVarExtractorTrait;

    private KernelBrowser $client;

    private function requestPage(string $uri, bool $xhr = false): string
    {
        if ($xhr) {
            $this->client->xmlHttpRequest('GET', $uri);
        } else {
            $this->client->request('GET', $uri);
        }

        return (string) $this->client->getResponse()->getContent();
    }

    private function requestJson(string $uri, bool $xhr = true): array
    {
        $payload = json_decode($this->requestPage($uri, $xhr), true);
        $this->assertIsArray($payload, 'The response is not a JSON object.');

        return $payload;
    }

    private function layoutRenderData(string $html): array
    {
        $data = $this->extractInlineJsonAssignment($html, 'layoutRenderData');
        $this->assertNotEmpty($data, 'The page carries no layoutRenderData.');

        return $data;
    }

    /**
     * What the visitor chose earlier, as the session holds it between pages.
     */
    private function saveUiState(string $usage, string $value): void
    {
        $session = $this->client->getContainer()->get('session.factory')->createSession();
        $session->set('ui_state.ui.'.$usage, $value);
        $session->save();

        $this->client->getCookieJar()->set(new Cookie($session->getName(), $session->getId()));
    }
}
