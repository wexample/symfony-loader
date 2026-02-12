<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Symfony\Component\Form\FormView;
use Twig\Environment;
use Wexample\SymfonyLoader\Rendering\ComponentManagerLocatorService;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\Usage\DefaultAssetUsageService;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyTranslations\Translation\Translator;

class FormService extends ComponentService
{
    private const FORM_FALLBACK_COMPONENT = '@WexampleSymfonyLoaderBundle/components/form';

    public function __construct(
        AssetsService $assetsService,
        ComponentManagerLocatorService $componentManagerLocatorService,
        Translator $translator,
        private readonly AssetsRegistryService $assetsRegistryService
    )
    {
        parent::__construct(
            $assetsService,
            $componentManagerLocatorService,
            $translator
        );
    }

    /**
     * Render a form template with the component pipeline so assets/domain handling
     * can be unified with components.
     *
     * @throws Exception
     */
    public function formLoad(
        Environment $twig,
        RenderPass $renderPass,
        FormView $formView,
        string $path,
        array $options = []
    ): string
    {
        if (!array_key_exists('ajax', $options)) {
            $options['ajax'] = (bool) ($formView->vars['ajax'] ?? false);
        }
        if (!array_key_exists('name', $options) && !empty($formView->vars['name'])) {
            $options['name'] = $formView->vars['name'];
        }

        $templateVars = [
            'form' => $formView,
        ];

        $component = $this->registerComponent(
            $twig,
            $renderPass,
            $path,
            ComponentService::INIT_MODE_PREVIOUS,
            $options,
            $templateVars,
            false
        );

        // Translation.
        // Add frontend domain.
        $component->addTranslationDomain(
            Translator::DOMAIN_TYPE_FORM,
            $formView->vars['translation_domain']
        );
        // Activate backend domain.
        $this->translator->setDomain(
            Translator::DOMAIN_TYPE_FORM,
            $formView->vars['translation_domain']
        );

        $this->componentRenderBody(
            $renderPass,
            $twig,
            $component,
            $templateVars
        );

        // Revert backend domain.
        $this->translator->revertDomain(Translator::DOMAIN_TYPE_FORM);

        if ($this->hasFormSpecificJs($renderPass, $path)) {
            return $component->getBody() . $component->renderTag();
        }

        return $this->renderWithFallbackFormComponent(
            $twig,
            $renderPass,
            $formView,
            $component
        );
    }

    private function hasFormSpecificJs(
        RenderPass $renderPass,
        string $path
    ): bool
    {
        $view = TemplateHelper::removeExtension($path);
        $jsPath = (new DefaultAssetUsageService($this->assetsRegistryService))
            ->buildPublicAssetPathFromView($view, 'js');

        return $renderPass->getAssetsRegistry()->assetExists($jsPath);
    }

    private function renderWithFallbackFormComponent(
        Environment $twig,
        RenderPass $renderPass,
        FormView $formView,
        \Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode $component
    ): string
    {
        $fallbackOptions = [
            'ajax' => (bool) ($formView->vars['ajax'] ?? false),
        ];
        if (!empty($formView->vars['name'])) {
            $fallbackOptions['name'] = $formView->vars['name'];
        }

        $fallback = $this->componentInitPrevious(
            $twig,
            $renderPass,
            self::FORM_FALLBACK_COMPONENT,
            $fallbackOptions
        );

        return $component->getBody() . $fallback->renderTag();
    }

}
