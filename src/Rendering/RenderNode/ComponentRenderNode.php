<?php

namespace Wexample\SymfonyDesignSystem\Rendering\RenderNode;

use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use Wexample\SymfonyDesignSystem\Helper\DomHelper;
use Wexample\SymfonyDesignSystem\Helper\RenderingHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyHelpers\Class\Traits\WithBodyClassTrait;
use Wexample\SymfonyHelpers\Helper\TemplateHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

class ComponentRenderNode extends AbstractRenderNode
{
    use WithBodyClassTrait;

    public function __construct(
        public string $initMode,
        public array $options = []
    ) {

    }

    public function init(
        RenderPass $renderPass,
        string $view,
    ): void {
        parent::init($renderPass, $view);

        $renderPass
            ->getCurrentContextRenderNode()
            ->components[] = $this;
    }

    public function getContextType(): string
    {
        return RenderingHelper::CONTEXT_COMPONENT;
    }

    public function renderCssClasses(): string
    {
        return 'com-class-loaded' . (! empty($this->cssClassName) ? ' ' . $this->cssClassName : '');
    }

    public function renderTag(): string
    {
        $cssClassName = trim($this->cssClassName ?? '');

        return DomHelper::buildTag(
            'span',
            [
                // ID are not used as "id" html attribute,
                // as component may be embedded into a vue,
                // so replicated multiple times.
                VariableHelper::CLASS_VAR => 'com-init' . (! empty($cssClassName) ? ' ' . $cssClassName : ''),
            ]
        );
    }

    public function toRenderData(): array
    {
        return parent::toRenderData()
            + [
                'initMode' => $this->initMode,
                'options' => $this->options,
            ];
    }

    /**
     * @throws RuntimeError
     * @throws SyntaxError
     * @throws LoaderError
     */
    public function render(Environment $env, array $parameters = []): void
    {
        $this->setBody($env->render(
            $this->getTemplatePath(),
            $this->options + $parameters
        ));
    }

    public function getTemplatePath(): string
    {
        return $this->getView().TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }
}
