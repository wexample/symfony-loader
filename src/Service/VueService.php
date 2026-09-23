<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Twig\Environment;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyLoader\Helper\ComponentPathHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Rendering\Vue;
use Wexample\SymfonyLoader\Twig\VueExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class VueService
{
    public array $renderedTemplates = [];

    public array $rootComponents = [];

    public const string TAG_TEMPLATE = 'template';

    public function __construct(
        protected readonly AdaptiveResponseService $adaptiveResponseService,
        protected readonly AssetsService $assetsService,
        protected readonly ComponentService $componentsService,
        protected readonly Translator $translator,
        protected readonly JsService $jsService
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
        string $tagName = self::TAG_TEMPLATE,
        ?array $options = []
    ): string {
        // Same two shapes as a component: `components/button` finds
        // `components/button/button.vue.twig` when the folder is there.
        $view = ComponentPathHelper::resolveView(
            $twig,
            $view,
            VueExtension::TEMPLATE_FILE_EXTENSION
        );

        $pathWithExtension = $view.VueExtension::TEMPLATE_FILE_EXTENSION;

        if (! $twig->getLoader()->exists($pathWithExtension)) {
            throw new Exception('Unable to find template: '.$pathWithExtension);
        }

        $vueDomId = DomHelper::buildStringIdentifier($view);

        $translationDomain = $this->translator->setDomainFromTemplatePath(
            Translator::DOMAIN_TYPE_VUE,
            $view
        );

        $wrapperOptions = $options ?? [];
        $componentOptions = [
            'domId' => $vueDomId,
            'name' => $view,
            'props' => $props,
            'translationDomain' => $translationDomain,
        ];

        $outputBody = '';
        $componentName = ComponentService::buildCoreComponentName(ComponentService::COMPONENT_NAME_VUE);

        if (! $this->isRenderPassInVueContext($renderPass)) {
            $rootComponent = $this
                ->componentsService
                ->registerComponent(
                    $twig,
                    $renderPass,
                    $componentName,
                    ComponentService::INIT_MODE_PARENT,
                    $componentOptions
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
                $view,
                // A vue compiles to javascript, and is built beside the scripts
                // rather than among them: a component holding both would
                // otherwise claim one file for two things.
                VueExtension::ASSET_DIRECTORY
            );

        if (! isset($this->renderedTemplates[$view])) {
            $renderPass->setCurrentContextRenderNode(
                $rootComponent
            );

            $rootComponent->addTranslationDomain(
                Translator::DOMAIN_TYPE_VUE,
                $translationDomain,
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
                    $twigContext + $componentOptions + $props + ['render_pass' => $renderPass]
                )
            );

            $rootComponent->translations = array_merge(
                $rootComponent->translations,
                $this->translator->transFilter('@vue::*')
            );

            $renderPass->revertCurrentContextRenderNode();

            $this->renderedTemplates[$view] = $template;
        }

        // Reverted whether or not the template was rendered this time: the
        // domain was set above either way. A vue required a second time — a
        // marker both a list and a distribution inside it ask for — would
        // otherwise leave its own domain on the stack, and the vue that asked
        // would find `@vue` pointing at a component that is not itself.
        $this->translator->revertDomain(
            Translator::DOMAIN_TYPE_VUE
        );

        if ($renderPass->isJsonRequest()) {
            $renderPass->getLayoutRenderNode()->vueTemplates = $this->renderedTemplates;
        }

        $wrapperClass = trim(
            implode(
                ' ',
                array_filter([
                    $vueDomId,
                    $wrapperOptions['class'] ?? null,
                ])
            )
        );

        return DomHelper::buildTag(
            $vueDomId,
            [
                'class' => $wrapperClass,
            ],
            $outputBody
        );
    }
}
