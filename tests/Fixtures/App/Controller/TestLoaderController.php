<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Wexample\SymfonyLoader\Controller\AbstractLoaderController;

final class TestLoaderController extends AbstractLoaderController
{
    #[Route('/_test/loader', name: 'symfony_loader_test_loader')]
    public function loader(): Response
    {
        return $this->adaptiveRender('@front/layout/test-layout-with-registry.html.twig');
    }
}
