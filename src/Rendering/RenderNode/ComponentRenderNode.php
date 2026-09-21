<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyHelpers\Class\Traits\WithBodyClassTrait;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\Asset;
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

    /**
     * Whether anything in the browser has to be built from this component.
     *
     * A component with no script has no class to instantiate: its markup is
     * already drawn and its stylesheet is loaded from the registry, so there is
     * nothing left for the client to do with it. Now that every element of the
     * design system is a component — a message, a menu item, a table cell —
     * most of them are in that case, and telling the client about them would
     * only have it look for a class nobody wrote.
     */
    public function hasClientSide(): bool
    {
        return ! empty($this->assets[Asset::EXTENSION_JS] ?? []);
    }

    public function renderTag(): string
    {
        // The tag is a hook for the script that binds the component, and there
        // is nothing to hook when there is no script.
        if (! $this->hasClientSide()) {
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
