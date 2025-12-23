<?php

namespace Wexample\SymfonyDesignSystem\Tests\Application\Role\Anonymous\Controller\Pages;

use Wexample\SymfonyDesignSystem\Controller\Config\DemoController;
use Wexample\SymfonyDesignSystem\Traits\SymfonyDesignSystemBundleClassTrait;
use Wexample\SymfonyTesting\Tests\AbstractRoleControllerTestCase;
use Wexample\SymfonyTesting\Tests\Traits\RoleAnonymousTestCaseTrait;
use Wexample\SymfonyTesting\Traits\ControllerTestCaseTrait;

class TestControllerTest extends AbstractRoleControllerTestCase
{
    use RoleAnonymousTestCaseTrait;
    use ControllerTestCaseTrait;
    use SymfonyDesignSystemBundleClassTrait;

    public function testIndex()
    {
        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_INDEX
        );
    }
}
