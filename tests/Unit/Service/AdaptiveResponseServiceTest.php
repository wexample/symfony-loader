<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;

class AdaptiveResponseServiceTest extends TestCase
{
    private function redirect(string $uri, string $target): string
    {
        $response = new RedirectResponse($target);
        (new AdaptiveResponseService())->keepShellOnRedirect(Request::create($uri), $response);

        return $response->getTargetUrl();
    }

    public function testShellFollowsTheRedirect(): void
    {
        $this->assertSame(
            '/conversations/?open=42&__layout=embed',
            $this->redirect('http://site.test/conversations/with/1?__layout=embed', '/conversations/?open=42')
        );
        $this->assertSame(
            '/next?__layout=panel#top',
            $this->redirect('http://site.test/a?__layout=panel&x=1', '/next#top')
        );
    }

    public function testLeftAloneOutsideAShellOrTheSite(): void
    {
        $this->assertSame('/next', $this->redirect('http://site.test/a', '/next'));
        $this->assertSame(
            'https://elsewhere.test/b',
            $this->redirect('http://site.test/a?__layout=panel', 'https://elsewhere.test/b')
        );
        $this->assertSame(
            '/next?__layout=modal',
            $this->redirect('http://site.test/a?__layout=panel', '/next?__layout=modal')
        );
    }

    public function testNotARedirect(): void
    {
        $response = new Response('ok');
        (new AdaptiveResponseService())->keepShellOnRedirect(Request::create('/a?__layout=panel'), $response);

        $this->assertSame('ok', $response->getContent());
    }
}
