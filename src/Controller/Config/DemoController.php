<?php

namespace Wexample\SymfonyDesignSystem\Controller\Config;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Wexample\SymfonyDesignSystem\Controller\AbstractPagesController;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Service\Usage\FontsAssetUsageService;
use Wexample\SymfonyDesignSystem\Traits\SymfonyDesignSystemBundleClassTrait;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

#[Route(path: '_design_system/demo/', name: '_design_system_demo_')]
final class DemoController extends AbstractPagesController
{
    use SymfonyDesignSystemBundleClassTrait;

    final public const ROUTE_INDEX = VariableHelper::INDEX;
    final public const ROUTE_ASSETS = VariableHelper::ASSETS;
    final public const ROUTE_AGGREGATION = 'aggregation';
    final public const ROUTE_COLOR_SCHEMES = 'color_schemes';
    final public const ROUTE_ICONS = 'icons';
    final public const ROUTE_LOADING = VariableHelper::LOADING;
    final public const ROUTE_LOADING_FETCH_SIMPLE = VariableHelper::LOADING.'_fetch_simple';
    final public const ROUTE_TRANSLATIONS = VariableHelper::TRANSLATIONS;
    final public const ROUTE_COMPONENTS = VariableHelper::PLURAL_COMPONENT;

    private bool $useJs = true;

    public static function getSimpleRoutes(): array
    {
        return [
            self::ROUTE_COMPONENTS,
            self::ROUTE_ICONS,
            self::ROUTE_LOADING,
            self::ROUTE_LOADING_FETCH_SIMPLE,
            self::ROUTE_TRANSLATIONS,
        ];
    }

    #[Route(path: '', name: self::ROUTE_INDEX)]
    final public function index(): Response
    {
        return $this->renderPage(
            self::ROUTE_INDEX
        );
    }

    protected function configureRenderPass(
        RenderPass $renderPass
    ): RenderPass {
        $renderPass->setUseJs($this->useJs);

        $renderPass->setUsage(
            FontsAssetUsageService::getName(),
            'demo'
        );

        return $renderPass;
    }

    #[Route(
        path: VariableHelper::ASSETS,
        name: self::ROUTE_ASSETS
    )]
    final public function assets(Request $request): Response
    {
        $this->useJs = ! $request->get('no_js');

        return $this->renderPage(
            self::ROUTE_ASSETS,
        );
    }

    #[Route(
        path: self::ROUTE_AGGREGATION,
        name: self::ROUTE_AGGREGATION
    )]
    final public function aggregation(): Response
    {
        // Prepare specific render pass.
        $renderPass = $this->createRenderPass();
        $renderPass->enableAggregation = true;

        return $this->renderPage(
            self::ROUTE_AGGREGATION,
            renderPass: $renderPass
        );
    }

    #[Route(
        path: 'color-schemes',
        name: self::ROUTE_COLOR_SCHEMES
    )]
    final public function colorSchemes(): Response
    {
        // Prepare specific render pass.
        $renderPass = $this->createRenderPass();

        // Allow every usage switch.
        foreach ($renderPass->usagesConfig as &$config) {
            foreach ($config['list'] as &$item) {
                $item['allow_switch'] = true;
            }
        }

        return $this->renderPage(
            self::ROUTE_COLOR_SCHEMES,
            renderPass: $renderPass
        );
    }
}
