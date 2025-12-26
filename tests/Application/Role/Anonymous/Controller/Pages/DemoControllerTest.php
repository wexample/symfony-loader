<?php

namespace Wexample\SymfonyLoader\Tests\Application\Role\Anonymous\Controller\Pages;

use Wexample\SymfonyLoader\Controller\Pages\DemoController;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyTesting\Tests\AbstractRoleControllerTestCase;
use Wexample\SymfonyTesting\Tests\Traits\RoleAnonymousTestCaseTrait;
use Wexample\SymfonyTesting\Traits\ControllerTestCaseTrait;

class DemoControllerTest extends AbstractRoleControllerTestCase
{
    use RoleAnonymousTestCaseTrait;
    use ControllerTestCaseTrait;
    use SymfonyLoaderBundleClassTrait;

    public function testIndex()
    {
        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_INDEX
        );
    }

    public function testAssets()
    {
        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_ASSETS
        );
    }

    public function testLoading()
    {
        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_LOADING
        );
    }

    public function testTranslations()
    {
        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_TRANSLATIONS
        );
    }

    public function testComponents()
    {
        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_COMPONENTS
        );
    }
}
