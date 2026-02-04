<?php

namespace Wexample\SymfonyLoader\Twig;

use Exception;
use Twig\Environment;
use Twig\TwigFunction;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\ComponentService;
use Wexample\SymfonyLoader\Twig\TokenParser\ComponentTokenParser;
use Wexample\SymfonyLoader\Twig\TokenParser\SlotTokenParser;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class ComponentsExtension extends AbstractExtension
{
    public function __construct(
        protected ComponentService $componentService,
    ) {
    }

    public function getFunctions(): array
    {
        $initOptions = [
            self::FUNCTION_OPTION_IS_SAFE => self::FUNCTION_OPTION_IS_SAFE_VALUE_HTML,
            self::FUNCTION_OPTION_NEEDS_ENVIRONMENT => true,
        ];

        return [
            new TwigFunction(
                'component',
                [
                    $this,
                    'component',
                ],
                $initOptions
            ),
            new TwigFunction(
                'component_init_class',
                [
                    $this,
                    'componentInitClass',
                ],
                $initOptions
            ),
            new TwigFunction(
                'component_init_parent',
                [
                    $this,
                    'componentInitParent',
                ],
                $initOptions
            ),
            new TwigFunction(
                'component_frontend',
                [
                    $this,
                    'componentFrontend',
                ],
                $initOptions
            ),
            new TwigFunction(
                'component_init_previous',
                [
                    $this,
                    'componentInitPrevious',
                ],
                $initOptions
            ),
            new TwigFunction(
                'component_render_tag_attributes',
                [
                    $this,
                    'componentRenderTagAttributes',
                ],
                [
                    self::FUNCTION_OPTION_IS_SAFE => self::FUNCTION_OPTION_IS_SAFE_VALUE_HTML,
                    self::FUNCTION_OPTION_NEEDS_CONTEXT => true,
                ]
            ),
        ];
    }

    public function getTokenParsers(): array
    {
        return [
            new ComponentTokenParser(),
            new SlotTokenParser(),
        ];
    }

    /**
     * @throws Exception
     */
    public function component(
        Environment $twig,
        RenderPass $renderPass,
        string $path,
        array $options = []
    ): string {
        $component = $this->componentService->componentInitPrevious(
            $twig,
            $renderPass,
            $path,
            $options
        );

        return $component->getBody().$component->renderTag();
    }

    /**
     * @throws Exception
     */
    public function componentInitPrevious(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): string {
        return $this->componentService->componentInitPrevious(
            $twig,
            $renderPass,
            $name,
            $options
        )->renderTag();
    }

    /**
     * Init a components and provide a class name to retrieve dom element.
     *
     * @throws Exception
     */
    public function componentInitClass(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): string {
        return $this
            ->componentService
            ->componentInitClass(
                $twig,
                $renderPass,
                $name,
                $options
            )->renderCssClasses();
    }

    /**
     * @throws Exception
     */
    public function componentInitParent(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): string {
        return $this
            ->componentService
            ->componentInitParent(
                $twig,
                $renderPass,
                $name,
                $options
            )->renderTag();
    }

    /**
     * @throws Exception
     */
    public function componentInitLayout(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): string {
        return $this
            ->componentService
            ->componentInitLayout(
                $twig,
                $renderPass,
                $name,
                $options
            )->renderTag();
    }

    /**
     * @throws Exception
     */
    public function componentFrontend(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): string {
        $options['frontend'] = true;
        $previousContext = $renderPass->getCurrentContextRenderNode();
        $renderPass->setCurrentContextRenderNode($renderPass->getLayoutRenderNode());

        $component = $this->componentService->componentInitLayout(
            $twig,
            $renderPass,
            $name,
            $options
        );

        $body = $component->getBody() ?: '';
        $template = '<template data-component-template="' . $component->getView() . '">' . $body . '</template>';
        $component->setBody($template);

        if ($previousContext) {
            $renderPass->setCurrentContextRenderNode($previousContext);
        }

        return '';
    }

    public function componentRenderTagAttributes(
        array $context,
        array $defaults = []
    ): string {
        $defaultAttributes = $defaults;
        if (isset($defaultAttributes['attr']) && is_array($defaultAttributes['attr'])) {
            $defaultAttributes = array_merge(
                $defaultAttributes,
                $defaultAttributes['attr']
            );
            unset($defaultAttributes['attr']);
        }

        $contextAttributes = $context['attr'] ?? $context;
        if (!is_array($contextAttributes)) {
            $contextAttributes = [];
        }

        // Avoid passing full Twig context by mistake.
        if (!isset($context['attr']) && (isset($context['options']) || isset($context['render_pass']) || isset($context['app']))) {
            $contextAttributes = [];
        }

        // Keep only scalar values to prevent "Array to string conversion".
        $contextAttributes = array_filter(
            $contextAttributes,
            static fn($value) => is_scalar($value) || null === $value
        );

        $class = trim(($defaultAttributes[VariableHelper::CLASS_VAR] ?? '').' '.($contextAttributes[VariableHelper::CLASS_VAR] ?? ''));

        $attributes = array_merge([
            VariableHelper::ID => $contextAttributes[VariableHelper::ID] ?? null,
            VariableHelper::CLASS_VAR => '' === $class ? null : $class,
        ], $defaultAttributes, $contextAttributes);


        return DomHelper::buildTagAttributes(
            $attributes
        );
    }
}
