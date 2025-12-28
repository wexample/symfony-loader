<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use JetBrains\PhpStorm\Pure;
use Twig\Environment;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTranslations\Translation\Translator;

class LayoutServiceAbstract extends AbstractRenderNodeService
{
    #[Pure]
    public function __construct(
        AssetsService $assetsService,
        protected readonly ComponentService $componentService,
        private readonly PageServiceAbstract $pageService,
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

        if ($renderPass->getLayoutBase() === RenderPass::BASE_MODAL) {
            // Prepare modal component.
            $this->componentService->componentInitLayout(
                $twig,
                $renderPass,
                ComponentService::buildCoreComponentName(ComponentService::COMPONENT_NAME_MODAL),
                [
                    'adaptiveResponsePageManager' => true,
                ]
            );
        } elseif ($renderPass->getLayoutBase() === RenderPass::BASE_PANEL) {
            // Prepare panel component.
            $this->componentService->componentInitLayout(
                $twig,
                $renderPass,
                ComponentService::buildCoreComponentName(ComponentService::COMPONENT_NAME_PANEL),
                [
                    'adaptiveResponsePageManager' => true,
                ]
            );
        } elseif ($renderPass->getLayoutBase() === RenderPass::BASE_OVERLAY) {
            // Prepare panel component.
            $this->componentService->componentInitLayout(
                $twig,
                $renderPass,
                ComponentService::buildCoreComponentName(ComponentService::COMPONENT_NAME_OVERLAY),
                [
                    'adaptiveResponsePageManager' => true,
                ]
            );
        }
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
}
