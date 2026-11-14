<?php

declare(strict_types=1);

namespace Wexample\SymfonyLoader\Tests\Integration;

use App\Controller\Pages\Demo\SampleAppController;
use Wexample\SymfonyLoader\Service\PageService;
use Wexample\SymfonyLoader\Tests\Fixtures\Controller\Pages\Demo\SampleSectionController;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

/**
 * The translation path of a page, from the controller method answering it:
 * the template location, then what follows the `Controller` namespace, the
 * method last, snake cased and joined by dots.
 */
class PageTranslationPathTest extends AbstractSymfonyKernelTestCase
{
    private function getPageService(): PageService
    {
        self::bootKernel();

        return self::getContainer()->get(PageService::class);
    }

    public function testABundleControllerStartsAfterItsControllerNamespace(): void
    {
        $this->assertSame(
            '@WexampleSymfonyLoaderBundle.pages.demo.sample_section.show_item',
            $this->getPageService()->buildTranslationPathFromClassPath(
                SampleSectionController::class.'::showItem',
                '@WexampleSymfonyLoaderBundle'
            )
        );
    }

    public function testAnApplicationControllerStartsAfterAppController(): void
    {
        require_once __DIR__.'/../Fixtures/AppNamespace/Controller/Pages/Demo/SampleAppController.php';

        $this->assertSame(
            '@front.pages.demo.sample_app.show_item',
            $this->getPageService()->buildTranslationPathFromClassPath(
                SampleAppController::class.'::showItem',
                '@front'
            )
        );
    }
}
