<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Helper\AdaptiveRequestHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;
use Wexample\SymfonyLoader\Twig\AdaptiveResponseExtension;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

/**
 * Rendering with no request at all — a console command, a test of another
 * package going through the real pipeline — or with one the kernel never
 * dispatched, which therefore never met the request subscriber.
 */
class RenderWithoutRequestTest extends AbstractSymfonyKernelTestCase
{
    private const string VIEW = '@front/pages/test-page.html.twig';

    private function getRequestStack(): RequestStack
    {
        return self::getContainer()->get('request_stack');
    }

    private function getRenderer(): AdaptiveRendererService
    {
        return self::getContainer()->get(AdaptiveRendererService::class);
    }

    public function testRenderPassWithEmptyRequestStackFallsBackToHtml(): void
    {
        self::bootKernel();

        $this->assertNull($this->getRequestStack()->getCurrentRequest());

        $renderPass = $this->getRenderer()->createRenderPass(self::VIEW);

        $this->assertSame(RenderPass::OUTPUT_TYPE_RESPONSE_HTML, $renderPass->getOutputType());
        $this->assertSame(RenderPass::BASE_DEFAULT, $renderPass->getLayoutBase());
    }

    public function testAdaptiveRenderWithEmptyRequestStackRendersTemplate(): void
    {
        self::bootKernel();

        $response = $this->getRenderer()->adaptiveRender(self::VIEW);

        $this->assertNotInstanceOf(JsonResponse::class, $response);
        $this->assertStringContainsString('TEST PAGE', (string) $response->getContent());
    }

    /**
     * The environment outlives the render: once done, the global is back to
     * what it held before, not left on a pass the next render does not own.
     */
    public function testTheRenderPassGlobalIsRestoredAfterTheRender(): void
    {
        self::bootKernel();
        $twig = self::getContainer()->get('twig');

        $this->getRenderer()->adaptiveRender(self::VIEW);

        $this->assertNull($twig->getGlobals()['render_pass']);
    }

    public function testRequestWithoutAdaptiveAttributesIsDetectedLikeTheSubscriberDoes(): void
    {
        self::bootKernel();

        $request = Request::create('/any', 'GET', ['__format' => 'json']);
        $this->assertFalse($request->attributes->has(AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE));

        $this->getRequestStack()->push($request);

        try {
            $renderPass = $this->getRenderer()->createRenderPass(self::VIEW);
        } finally {
            $this->getRequestStack()->pop();
        }

        $this->assertSame(RenderPass::OUTPUT_TYPE_RESPONSE_JSON, $renderPass->getOutputType());
        $this->assertSame(RenderPass::BASE_MODAL, $renderPass->getLayoutBase());
    }

    public function testStandaloneUriWithEmptyRequestStackIsEmpty(): void
    {
        self::bootKernel();

        $extension = self::getContainer()->get(AdaptiveResponseExtension::class);

        $this->assertSame('', $extension->adaptiveResponseStandaloneUri());
    }
}
