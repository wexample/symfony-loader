<?php

namespace Wexample\SymfonyLoader\Twig\Runtime;

use Exception;
use Twig\Environment;
use Twig\Extension\RuntimeExtensionInterface;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\ComponentService;

class ComponentSlotsRuntime implements RuntimeExtensionInterface
{
    private array $componentStack = [];
    private array $slotStack = [];

    public function __construct(
        private readonly ComponentService $componentService
    ) {
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
            throw new Exception('slot called outside of component.');
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
            throw new Exception('endslot called without slot.');
        }

        $currentName = array_pop($this->slotStack);
        if ($currentName !== $name) {
            throw new Exception('endslot name does not match slot.');
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
            throw new Exception('endcomponent called while a slot is still open.');
        }

        if (empty($this->componentStack)) {
            throw new Exception('endcomponent called without component.');
        }

        $entry = array_pop($this->componentStack);
        if ($entry['path'] !== $path) {
            throw new Exception('endcomponent path does not match component.');
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
