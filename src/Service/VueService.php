<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Symfony\Contracts\Service\ResetInterface;
use Twig\Environment;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyLoader\Helper\ComponentPathHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Rendering\Vue;
use Wexample\SymfonyLoader\Twig\VueExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class VueService implements ResetInterface
{
    public array $renderedTemplates = [];

    public array $rootComponents = [];

    /**
     * What each rendered vue gave its root component, so that another root
     * of the same vue gets it too: its template is rendered once per page.
     */
    protected array $renderedTranslations = [];

    /**
     * Vues whose template is being rendered, innermost last.
     */
    protected array $renderingViews = [];

    public const string TAG_TEMPLATE = 'template';

    public function __construct(
        protected readonly AdaptiveResponseService $adaptiveResponseService,
        protected readonly AssetsService $assetsService,
        protected readonly ComponentService $componentsService,
        protected readonly Translator $translator,
        protected readonly JsService $jsService
    ) {
    }

    /**
     * What was rendered belongs to the page that rendered it: a worker serving
     * the next page must render its vues and templates again.
     */
    public function reset(): void
    {
        $this->renderedTemplates = [];
        $this->rootComponents = [];
        $this->renderedTranslations = [];
        $this->renderingViews = [];
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

        if ($parentView = end($this->renderingViews)) {
            $this->renderedTranslations[$parentView]['children'][$view] = true;
        }

        if (! isset($this->renderedTemplates[$view])) {
            $renderPass->setCurrentContextRenderNode(
                $rootComponent
            );

            $rootComponent->addTranslationDomain(
                Translator::DOMAIN_TYPE_VUE,
                $translationDomain,
                $view
            );

            // Collected apart, to be kept for the next roots of this vue.
            $rootTranslations = $rootComponent->translations;
            $rootComponent->translations = [];
            $this->renderedTranslations[$view] = [
                'domain' => $translationDomain,
                'children' => [],
            ];
            $this->renderingViews[] = $view;

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

            array_pop($this->renderingViews);

            $this->renderedTranslations[$view]['translations'] = array_merge(
                $rootComponent->translations,
                $this->translator->transFilter('@vue::*')
            );

            $rootComponent->translations = array_merge(
                $rootTranslations,
                $this->renderedTranslations[$view]['translations']
            );

            $renderPass->revertCurrentContextRenderNode();

            $this->renderedTemplates[$view] = $template;
        } else {
            $this->restoreTranslations($rootComponent, $view);
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

    /**
     * Give a root the domains and translations a vue gave the first root it
     * was rendered for, the vues rendered inside its template included.
     */
    protected function restoreTranslations(
        AbstractRenderNode $rootComponent,
        string $view,
        array $restored = []
    ): void {
        $rendered = $this->renderedTranslations[$view] ?? null;

        // Still rendering, or already given: a vue inside itself (a tree).
        if (! isset($rendered['translations']) || isset($restored[$view])) {
            return;
        }

        $restored[$view] = true;

        $rootComponent->addTranslationDomain(
            Translator::DOMAIN_TYPE_VUE,
            $rendered['domain'],
            $view
        );

        $rootComponent->translations = array_merge(
            $rootComponent->translations,
            $rendered['translations']
        );

        foreach (array_keys($rendered['children']) as $childView) {
            $this->restoreTranslations($rootComponent, $childView, $restored);
        }
    }
}
