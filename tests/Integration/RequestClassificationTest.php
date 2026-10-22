<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;

/**
 * Which answer a request gets — the document or the JSON envelope — and into
 * which shell the page is drawn. Read from the request only, before anything
 * renders, so every case is checked on the render pass itself.
 */
class RequestClassificationTest extends KernelTestCase
{
    public static function requests(): iterable
    {
        yield 'a browser opening a page' => [[], false, RenderPass::OUTPUT_TYPE_RESPONSE_HTML, RenderPass::BASE_DEFAULT];
        yield 'the front-end fetching a page' => [[], true, RenderPass::OUTPUT_TYPE_RESPONSE_JSON, RenderPass::BASE_MODAL];
        yield '__format asks for json' => [['__format' => 'json'], false, RenderPass::OUTPUT_TYPE_RESPONSE_JSON, RenderPass::BASE_MODAL];
        yield '__format asks for html over an xhr' => [['__format' => 'html'], true, RenderPass::OUTPUT_TYPE_RESPONSE_HTML, RenderPass::BASE_DEFAULT];
        yield 'an unknown __format is ignored' => [['__format' => 'xml'], false, RenderPass::OUTPUT_TYPE_RESPONSE_HTML, RenderPass::BASE_DEFAULT];
        yield '__layout picks the shell' => [['__layout' => RenderPass::BASE_PANEL], true, RenderPass::OUTPUT_TYPE_RESPONSE_JSON, RenderPass::BASE_PANEL];
        yield 'an unknown __layout falls back to the modal' => [['__layout' => 'sidebar'], true, RenderPass::OUTPUT_TYPE_RESPONSE_JSON, RenderPass::BASE_MODAL];
        yield 'a document has a single shell' => [['__layout' => RenderPass::BASE_PANEL], false, RenderPass::OUTPUT_TYPE_RESPONSE_HTML, RenderPass::BASE_DEFAULT];
    }

    #[DataProvider('requests')]
    public function testTheRequestDecidesTheAnswer(
        array $query,
        bool $xhr,
        string $outputType,
        string $layoutBase,
    ): void {
        $request = Request::create('/page', 'GET', $query);
        if ($xhr) {
            $request->headers->set('X-Requested-With', 'XMLHttpRequest');
        }

        $renderPass = $this->createRenderPassFor($request);

        $this->assertSame($outputType, $renderPass->getOutputType());
        $this->assertSame($layoutBase, $renderPass->getLayoutBase());
    }

    private function createRenderPassFor(Request $request): RenderPass
    {
        /** @var RequestStack $requestStack */
        $requestStack = self::getContainer()->get('request_stack');
        $requestStack->push($request);

        try {
            return self::getContainer()
                ->get(AdaptiveRendererService::class)
                ->createRenderPass('@front/pages/test-page.html.twig');
        } finally {
            $requestStack->pop();
        }
    }
}
