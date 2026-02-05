<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use JetBrains\PhpStorm\Pure;
use Twig\Environment;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTranslations\Translation\Translator;

class LayoutService extends AbstractRenderNodeService
{
    #[Pure]
    public function __construct(
        AssetsService $assetsService,
        protected readonly ComponentService $componentService,
        private readonly PageService $pageService,
        private readonly array $layoutBases = [],
        protected readonly Translator $translator,
    ) {
        parent::__construct(
            $assetsService,
        );
    }

    /**
     * @throws Exception
     */
    public function layoutInitialInit(
        Environment $twig,
        RenderPass $renderPass,
    ): void {
        $this->layoutInit($renderPass);
        $this->layoutInitPageManagerComponent($twig, $renderPass);
    }

    /**
     * @throws Exception
     */
    public function layoutInit(
        RenderPass $renderPass,
    ): void {
        $layoutRenderNode = $renderPass->getLayoutRenderNode();

        $this->initRenderNode(
            $layoutRenderNode,
            $renderPass,
            $layoutRenderNode->getView(),
        );

        $domain = $layoutRenderNode->getContextType();
        $layoutRenderNode->addTranslationDomain(
            $domain,
            $this->translator->setDomainFromTemplatePath(
                $domain,
                $layoutRenderNode->getView(),
            ),
            $layoutRenderNode->getView()
        );

        $this->pageService->pageInit(
            $renderPass,
            $layoutRenderNode->createLayoutPageInstance(),
            $renderPass->getView(),
        );
    }

    /**
     * Register a layout-specific page manager component (modal/panel/overlay/...),
     * configured through `loader.layout_bases`.
     *
     * @throws Exception
     */
    private function layoutInitPageManagerComponent(
        Environment $twig,
        RenderPass $renderPass,
    ): void {
        $layoutBase = $renderPass->getLayoutBase();
        $layoutConfig = $this->layoutBases[$layoutBase] ?? null;
        $view = $layoutConfig['page_manager_component'] ?? null;

        if (!is_string($view) || $view === '') {
            return;
        }

        $this->componentService->componentInitLayout(
            $twig,
            $renderPass,
            $view,
            [
                'adaptiveResponsePageManager' => true,
            ]
        );
    }
}
