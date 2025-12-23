<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Exception;
use Twig\Environment;
use Wexample\SymfonyDesignSystem\Helper\DomHelper;
use Wexample\SymfonyDesignSystem\Helper\RenderingHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Twig\VueExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class VueService
{
    public array $renderedTemplates = [];

    public array $rootComponents = [];

    public const string TAG_TEMPLATE = 'template';

    public function __construct(
        readonly protected AdaptiveResponseService $adaptiveResponseService,
        readonly protected AssetsService $assetsService,
        readonly protected ComponentService $componentsService,
        readonly protected Translator $translator,
        readonly protected JsService $jsService
    ) {
    }

    public function isRenderPassInVueContext(RenderPass $renderPass): bool
    {
        return ComponentService::buildCoreComponentName(ComponentService::COMPONENT_NAME_VUE) === $renderPass->getCurrentContextRenderNode()->getView();
    }

    /**
     * @throws Exception
     */
    public function vueRender(
        Environment $twig,
        RenderPass $renderPass,
        string $view,
        ?array $props = [],
        ?array $twigContext = [],
        string $tagName = self::TAG_TEMPLATE
    ): string {
        $pathWithExtension = $view.VueExtension::TEMPLATE_FILE_EXTENSION;

        if (!$twig->getLoader()->exists($pathWithExtension)) {
            throw new Exception('Unable to find template: '.$pathWithExtension);
        }

        $vueDomId = DomHelper::buildStringIdentifier($view);

        $options = [
            'domId' => $vueDomId,
            'name' => $view,
            'props' => $props
        ];

        $outputBody = '';
        $componentName = ComponentService::buildCoreComponentName(ComponentService::COMPONENT_NAME_VUE);

        if (!$this->isRenderPassInVueContext($renderPass)) {
            $rootComponent = $this
                ->componentsService
                ->registerComponent(
                    $twig,
                    $renderPass,
                    $componentName,
                    ComponentService::INIT_MODE_PARENT,
                    $options
                );

            $this->rootComponents[$view] = $rootComponent;

            $outputBody = $rootComponent->renderTag();
        } else {
            $rootComponent = $renderPass->getCurrentContextRenderNode();

            $contextCurrent = RenderingHelper::buildRenderContextKey(
                RenderingHelper::CONTEXT_COMPONENT,
                $rootComponent->getView()
            );

            if ($rootComponent->getContextRenderNodeKey() !== $contextCurrent) {
                throw new Exception('Trying to render a non-root vue outside the vue context. Current context is '.$contextCurrent);
            }
        }

        // Append assets to root vue component.
        $this
            ->assetsService
            ->assetsDetect(
                $renderPass,
                $rootComponent,
                $view
            );

        if (!isset($this->renderedTemplates[$view])) {
            $renderPass->setCurrentContextRenderNode(
                $rootComponent
            );

            $this->translator->setDomainFromTemplatePath(
                Translator::DOMAIN_TYPE_VUE,
                $view
            );

            $template = DomHelper::buildTag(
                $tagName,
                [
                    'class' => 'vue vue-loading',
                    'id' => 'vue-template-'.$vueDomId,
                ],
                $twig->render(
                    $pathWithExtension,
                    $twigContext + $options + $props + ['render_pass' => $renderPass]
                )
            );

            $rootComponent->translations['INCLUDE|'.$view] = (object) $this->translator->transFilter('@vue::*');

            $this->translator->revertDomain(
                Translator::DOMAIN_TYPE_VUE
            );

            $renderPass->revertCurrentContextRenderNode();

            $this->renderedTemplates[$view] = $template;
        }

        if ($renderPass->isJsonRequest()) {
            $renderPass->layoutRenderNode->vueTemplates = $this->renderedTemplates;
        }

        return DomHelper::buildTag(
            $vueDomId,
            [
                'class' => $vueDomId,
            ],
            $outputBody
        );
    }
}
