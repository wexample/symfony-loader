<?php

namespace Wexample\SymfonyLoader\Tests\Application\Role\Anonymous\Controller\Pages;

use Wexample\SymfonyLoader\Controller\Pages\DemoController;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyTesting\Tests\AbstractRoleControllerTestCase;
use Wexample\SymfonyTesting\Tests\Traits\RoleAnonymousTestCaseTrait;
use Wexample\SymfonyTesting\Traits\ControllerTestCaseTrait;

class TestControllerTest extends AbstractRoleControllerTestCase
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
}
