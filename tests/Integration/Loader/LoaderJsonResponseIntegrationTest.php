<?php

namespace Wexample\SymfonyLoader\Tests\Integration\Loader;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Tests\Fixtures\App\Controller\TestLoaderController;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

class LoaderJsonResponseIntegrationTest extends AbstractSymfonyKernelTestCase
{
    public function testLoaderActionReturnsJsonResponseWhenFormatJson(): void
    {
        self::bootKernel();

        /** @var RequestStack $requestStack */
        $requestStack = self::getContainer()->get('request_stack');

        $request = Request::create('/_test/loader', 'GET', [
            '__format' => 'json',
        ]);

        $requestStack->push($request);

        try {
            /** @var TestLoaderController $controller */
            $controller = self::getContainer()->get(TestLoaderController::class);

            $response = $controller->loader();

            $this->assertInstanceOf(JsonResponse::class, $response);

            $payload = json_decode((string) $response->getContent(), true);
            $this->assertIsArray($payload);

            $this->assertArrayHasKey('view', $payload);
            $this->assertArrayHasKey('renderRequestId', $payload);
            $this->assertArrayHasKey('page', $payload);
            $this->assertArrayHasKey('env', $payload);
            $this->assertArrayHasKey('body', $payload);
        } finally {
            $requestStack->pop();
        }
    }
}
