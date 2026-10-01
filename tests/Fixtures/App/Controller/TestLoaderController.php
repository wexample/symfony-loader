<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Wexample\SymfonyLoader\Controller\AbstractLoaderController;

final class TestLoaderController extends AbstractLoaderController
{
    #[Route('/page', name: 'symfony_loader_test_page')]
    public function page(): Response
    {
        return $this->adaptiveRender('@front/pages/test-page.html.twig');
    }

    #[Route('/page/broken', name: 'symfony_loader_test_page_broken')]
    public function broken(): Response
    {
        return $this->adaptiveRender('@front/pages/broken-page.html.twig');
    }
}
