<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Wexample\SymfonyLoader\Rendering\Asset;
use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyHelpers\Class\Traits\WithBodyClassTrait;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

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
        // The tag is a hook for the script that binds the component. A component
        // with no script has nothing to bind, and now that every element of the
        // design system is a component, emitting one anyway would put a dead
        // span after every button, message and table cell on the page.
        if (empty($this->assets[Asset::EXTENSION_JS] ?? [])) {
            return '';
        }

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

    public function toRenderData(): \Wexample\SymfonyLoader\Rendering\RenderData
    {
        $renderData = parent::toRenderData();
        $renderData->merge([
            'initMode' => $this->initMode,
            'options' => $this->options,
        ]);

        return $renderData;
    }

    /**
     * @throws RuntimeError
     * @throws SyntaxError
     * @throws LoaderError
     */
    public function render(
        Environment $env,
        array $parameters = []
    ): void {
        $this->setBody($env->render(
            $this->getTemplatePath(),
            $this->options + $parameters
        ));
    }

    public function getTemplatePath(): string
    {
        if (($this->options['frontend'] ?? false) === true) {
            return $this->getView() . '.front' . TemplateHelper::TEMPLATE_FILE_EXTENSION;
        }

        return $this->getView() . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    public function setOptionValue(
        string $key,
        mixed $value
    ): void {
        $this->options[$key] = $value;
    }
}
