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
    private array $componentStack = [];
    private array $slotStack = [];

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

    public function componentRenderTagAttributes(
        array $context,
        array $defaults = []
    ): string {
        $class = trim(($defaults[VariableHelper::CLASS_VAR] ?? '').' '.($context[VariableHelper::CLASS_VAR] ?? ''));

        $attributes = array_merge([
            VariableHelper::ID => $context[VariableHelper::ID] ?? null,
            VariableHelper::CLASS_VAR => '' === $class ? null : $class,
        ], $context['attr'] ?? []);


        return DomHelper::buildTagAttributes(
            $attributes
        );
    }

    /**
     * @throws Exception
     */
    public function componentStart(
        Environment $twig,
        RenderPass $renderPass,
        string $path,
        array $options = []
    ): string {
        $component = $this->componentService->registerComponent(
            $twig,
            $renderPass,
            $path,
            ComponentService::INIT_MODE_PREVIOUS,
            $options,
            false
        );

        $this->componentStack[] = [
            'path' => $path,
            'component' => $component,
            'slots' => [],
        ];

        ob_start();

        return '';
    }

    public function componentSlotStart(
        Environment $twig,
        RenderPass $renderPass,
        string $name
    ): string {
        if (empty($this->componentStack)) {
            throw new Exception('component_slot_start called without component_start.');
        }

        $this->slotStack[] = $name;
        ob_start();

        return '';
    }

    public function componentSlotEnd(
        Environment $twig,
        RenderPass $renderPass,
        string $name
    ): string {
        if (empty($this->slotStack)) {
            throw new Exception('component_slot_end called without component_slot_start.');
        }

        $currentName = array_pop($this->slotStack);
        if ($currentName !== $name) {
            throw new Exception('component_slot_end name does not match component_slot_start.');
        }

        $content = ob_get_clean();
        $index = array_key_last($this->componentStack);

        $this->componentStack[$index]['slots'][$name] = $content;

        return '';
    }

    /**
     * @throws Exception
     */
    public function componentEnd(
        Environment $twig,
        RenderPass $renderPass,
        string $path
    ): string {
        if (!empty($this->slotStack)) {
            throw new Exception('component_end called while a slot is still open.');
        }

        if (empty($this->componentStack)) {
            throw new Exception('component_end called without component_start.');
        }

        $entry = array_pop($this->componentStack);
        if ($entry['path'] !== $path) {
            throw new Exception('component_end path does not match component_start.');
        }

        $defaultContent = ob_get_clean();
        if ('' !== $defaultContent) {
            $entry['slots']['default'] = $defaultContent;
        }

        $component = $entry['component'];
        $component->options['slots'] = $entry['slots'];

        if (!array_key_exists('body', $component->options) && isset($entry['slots']['default'])) {
            $component->options['body'] = $entry['slots']['default'];
        }

        $this->componentService->componentRenderBody(
            $renderPass,
            $twig,
            $component
        );

        return $component->getBody() . $component->renderTag();
    }
}
