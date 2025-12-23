<?php

namespace Wexample\SymfonyDesignSystem\Tests\Application\Assets;

use Wexample\SymfonyDesignSystem\Controller\Config\DemoController;
use Wexample\SymfonyDesignSystem\Tests\Traits\DesignSystemTestCaseTrait;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyTestCase;
use Wexample\SymfonyTesting\Traits\ControllerTestCaseTrait;

class AssetsTest extends AbstractSymfonyTestCase
{
    use ControllerTestCaseTrait;
    use DesignSystemTestCaseTrait;

    public function testAssetsLoading()
    {
        $this->createGlobalClient();

        $this->goToControllerRouteAndCheckHtml(
            DemoController::ROUTE_INDEX
        );

        $layoutRenderData = $this->getPageLayoutData();

        $this->assertNotEmpty(
            $layoutRenderData,
            'Html contains layout data.'
        );

        $this->assertRenderData($layoutRenderData);

        $this->assertTrue(
            isset($layoutRenderData['page']),
            'Layout data contains page data'
        );

        $this->assertRenderData($layoutRenderData['page']);

        $pageRenderData = $layoutRenderData['page'];

        $this->assertTrue(
            isset($pageRenderData['assets']['css']),
            'Demo page contains a default css page.'
        );
    }

    protected function assertRenderData(array $renderData): void
    {
        $this->assertTrue(
            isset($renderData['assets']),
            'Render data contains assets entry'
        );
    }

    public static function getControllerClass(): string
    {
        return DemoController::class;
    }
}
