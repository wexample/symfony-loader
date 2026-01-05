<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;

class AdaptiveResponseServiceTest extends TestCase
{
    public function testDetectOutputTypeForcedValidFormat(): void
    {
        $request = new Request([AdaptiveResponseService::QUERY_STRING_CONFIG_KEY_FORMAT => RenderPass::OUTPUT_TYPE_RESPONSE_JSON]);
        $stack = new RequestStack();
        $stack->push($request);

        $service = new AdaptiveResponseService($stack);

        $this->assertSame(RenderPass::OUTPUT_TYPE_RESPONSE_JSON, $service->detectOutputType());
    }

    public function testDetectOutputTypeFallsBackToRequestType(): void
    {
        $ajaxRequest = new Request();
        $ajaxRequest->headers->set('X-Requested-With', 'XMLHttpRequest');
        $stack = new RequestStack();
        $stack->push($ajaxRequest);

        $service = new AdaptiveResponseService($stack);

        $this->assertSame(RenderPass::OUTPUT_TYPE_RESPONSE_JSON, $service->detectOutputType());
    }

    public function testDetectLayoutBaseReturnsModalForJsonRequests(): void
    {
        $stack = new RequestStack();
        $stack->push(new Request());

        $renderPass = $this->createStub(RenderPass::class);
        $renderPass->method('isJsonRequest')->willReturn(true);

        $service = new AdaptiveResponseService($stack);

        $this->assertSame(RenderPass::BASE_MODAL, $service->detectLayoutBase($renderPass));
    }

    public function testDetectLayoutBaseDefaultForHtml(): void
    {
        $stack = new RequestStack();
        $stack->push(new Request());

        $renderPass = $this->createStub(RenderPass::class);
        $renderPass->method('isJsonRequest')->willReturn(false);

        $service = new AdaptiveResponseService($stack);

        $this->assertSame(RenderPass::BASE_DEFAULT, $service->detectLayoutBase($renderPass));
    }

    public function testGetLayoutBasePath(): void
    {
        $stack = new RequestStack();
        $stack->push(new Request());

        $renderPass = $this->createStub(RenderPass::class);
        $renderPass->method('getOutputType')->willReturn(RenderPass::OUTPUT_TYPE_RESPONSE_HTML);
        $renderPass->method('getLayoutBase')->willReturn(RenderPass::BASE_DEFAULT);

        $service = new AdaptiveResponseService($stack);

        $path = $service->getLayoutBasePath($renderPass);

        $this->assertStringContainsString('bases/', $path);
        $this->assertStringEndsWith('/html/default.html.twig', str_replace('\\', '/', $path));
    }
}
