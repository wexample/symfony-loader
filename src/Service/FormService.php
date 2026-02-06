<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Symfony\Component\Form\FormView;
use Twig\Environment;
use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTranslations\Translation\Translator;

class FormService extends ComponentService
{
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
    ): ComponentRenderNode
    {
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

        $this->translator->revertDomain(Translator::DOMAIN_TYPE_FORM);

        return $component;
    }
}
