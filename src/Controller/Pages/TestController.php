<?php

namespace Wexample\SymfonyLoader\Controller\Pages;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Wexample\SymfonyLoader\Controller\AbstractPagesController;
use Wexample\SymfonyLoader\Service\Usage\FontsAssetUsageService;
use Wexample\SymfonyLoader\Traits\SymfonyLoaderBundleClassTrait;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

#[Route(path: '_loader/test/', name: '_loader_test_')]
final class TestController extends AbstractPagesController
{
    use SymfonyLoaderBundleClassTrait;

    final public const ROUTE_ADAPTIVE = 'adaptive';
    final public const ROUTE_ERROR_MISSING_VIEW = 'error_missing_view';
    final public const ROUTE_INDEX = VariableHelper::INDEX;
    final public const ROUTE_VIEW = VariableHelper::VIEW;

    #[Route(path: '', name: self::ROUTE_INDEX)]
    final public function index(Request $request): Response
    {
        $renderPass = $this->createRenderPass(
            $this->buildControllerTemplatePath(
                self::ROUTE_INDEX,
            )
        );

        $renderPass->setUsage(
            FontsAssetUsageService::getName(),
            'demo'
        );

        $renderPass->enableAggregation = $request->get('test-aggregation', false);

        return $this->renderPage(
            self::ROUTE_INDEX,
            renderPass: $renderPass
        );
    }

    #[Route(path: self::ROUTE_ADAPTIVE, name: self::ROUTE_ADAPTIVE, options: self::ROUTE_OPTIONS_ONLY_EXPOSE)]
    final public function adaptive(Request $request): Response
    {
        $renderPass = $this->createRenderPass(
            $this->buildControllerTemplatePath(
                self::ROUTE_ADAPTIVE,
            )
        );

        if ($request->get('no-js')) {
            $renderPass->setUseJs(false);
        }

        return $this->renderPage(
            self::ROUTE_ADAPTIVE,
            renderPass: $renderPass
        );
    }

    #[Route(path: self::ROUTE_VIEW, name: self::ROUTE_VIEW, options: self::ROUTE_OPTIONS_ONLY_EXPOSE)]
    public function view(): Response
    {
        return $this->renderPage(
            self::ROUTE_VIEW,
            bundle: self::getBundleClassName());
    }

    #[Route(path: 'error-missing-view', name: self::ROUTE_ERROR_MISSING_VIEW, options: self::ROUTE_OPTIONS_ONLY_EXPOSE)]
    public function errorMissingVue(): Response
    {
        return $this->renderPage(
            self::ROUTE_ERROR_MISSING_VIEW
        );
    }
}
