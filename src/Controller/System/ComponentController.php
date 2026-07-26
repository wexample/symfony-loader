<?php

namespace Wexample\SymfonyLoader\Controller\System;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Attribute\Route;
use Twig\Environment;
use Wexample\SymfonyLoader\Controller\AbstractLoaderController;
use Wexample\SymfonyLoader\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyLoader\Service\AdaptiveRendererService;
use Wexample\SymfonyLoader\Service\ComponentService;

#[Route(path: '/_system/component', name: '_system_component_')]
class ComponentController extends AbstractLoaderController
{
    public function __construct(
        AdaptiveRendererService $adaptiveRendererService,
        private readonly ComponentService $componentService,
        private readonly Environment $twig,
        private readonly KernelInterface $kernel,
    ) {
        parent::__construct($adaptiveRendererService);
    }

    #[Route(path: '/render', name: 'render', methods: ['GET'])]
    public function load(Request $request): JsonResponse
    {
        $path = $request->query->get('path', '');

        if (! $path) {
            return new JsonResponse(
                ['ok' => false, 'error' => 'Missing path parameter'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $props = $request->query->all('props');

        $renderPass = $this->adaptiveRendererService->createRenderPass('_system/component/render');

        $layoutNode = new AjaxLayoutRenderNode($this->kernel->getEnvironment());
        $renderPass->setLayoutRenderNode($layoutNode);
        $this->componentService->initRenderNode($layoutNode, $renderPass, '_system/component');

        $component = $this->componentService->registerComponent(
            $this->twig,
            $renderPass,
            $path,
            ComponentService::INIT_MODE_LAYOUT,
            $props,
        );

        $renderData = $component->toRenderData()->toArray();
        $renderData['body'] = $component->getBody();

        return new JsonResponse($renderData);
    }
}
