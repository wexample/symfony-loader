<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Twig\Environment;
use Symfony\Component\Form\FormView;
use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;

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
    ): ComponentRenderNode {
        $templateVars = [
            'form' => $formView,
        ];

        return $this->componentInitPrevious(
            $twig,
            $renderPass,
            $path,
            $options,
            $templateVars
        );
    }
}
