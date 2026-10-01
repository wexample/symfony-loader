<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Twig\Environment;
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

    /**
     * A controller sending a mail before answering: the mail body is rendered
     * through the shared Twig environment before the page is.
     */
    #[Route('/page/after-mail', name: 'symfony_loader_test_page_after_mail')]
    public function afterMail(Environment $twig): Response
    {
        $twig->render('@front/mails/activation.html.twig');

        return $this->adaptiveRender('@front/pages/test-page.html.twig');
    }
}
