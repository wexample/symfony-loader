<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Exception;
use Twig\Environment;
use Wexample\SymfonyDesignSystem\Helper\DomHelper;
use Wexample\SymfonyDesignSystem\Rendering\ComponentManagerLocatorService;
use Wexample\SymfonyDesignSystem\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\WexampleSymfonyDesignSystemBundle;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyTranslations\Translation\Translator;

class ComponentService extends RenderNodeService
{
    // Component is loaded with a css class.
    public const INIT_MODE_CLASS = VariableHelper::CLASS_VAR;

    // Component is simply loaded from PHP or from backend adaptive event. It may have no target tag.
    public const INIT_MODE_LAYOUT = VariableHelper::LAYOUT;

    // Component is loaded from template into the target tag.
    public const INIT_MODE_PARENT = VariableHelper::PARENT;

    // Component is loaded from template, just after target tag.
    public const INIT_MODE_PREVIOUS = VariableHelper::PREVIOUS;

    public const COMPONENT_NAME_VUE = 'components/vue';

    public const COMPONENT_NAME_MODAL = 'components/modal';

    public const COMPONENT_NAME_PANEL = 'components/panel';

    public const COMPONENT_NAME_OVERLAY = 'components/overlay';

    public function __construct(
        AssetsService $assetsService,
        protected readonly ComponentManagerLocatorService $componentManagerLocatorService,
        protected readonly Translator $translator
    ) {
        parent::__construct(
            $assetsService,
        );
    }

    public static function buildCoreComponentName(string $shortName): string
    {
        return BundleHelper::ALIAS_PREFIX.WexampleSymfonyDesignSystemBundle::getAlias().'/'.$shortName;
    }

    /**
     * @throws Exception
     */
    public function componentRenderBody(
        RenderPass $renderPass,
        Environment $twig,
        ComponentRenderNode $component
    ): string {
        $loader = $twig->getLoader();

        try {
            if ($loader->exists($component->getTemplatePath())) {
                $renderPass->setCurrentContextRenderNode(
                    $component
                );

                $this->translator->setDomainFromTemplatePath(
                    Translator::DOMAIN_TYPE_COMPONENT,
                    $component->getView()
                );

                $component->render(
                    $twig,
                    [
                        'render_pass' => $renderPass,
                    ]
                );

                $this->translator->revertDomain(
                    Translator::DOMAIN_TYPE_COMPONENT
                );

                $renderPass->revertCurrentContextRenderNode();
            } else {
                $component->setBody(null);
            }

            return DomHelper::buildTag(DomHelper::TAG_SPAN);
        } catch (Exception $exception) {
            throw new Exception('Error during rendering component '.$component->getView().' : '.$exception->getMessage(), $exception->getCode(), $exception);
        }
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
    ): ComponentRenderNode {
        return $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            self::INIT_MODE_CLASS,
            $options
        );
    }

    /**
     * @throws Exception
     */
    public function componentInitLayout(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): ComponentRenderNode {
        $component = $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            ComponentService::INIT_MODE_LAYOUT,
            $options
        );

        $component->setBody(
            ($component->getBody() ?: '') . $component->renderTag()
        );

        return $component;
    }

    /**
     * Add component to the global page requirements.
     * It adds components assets to page assets.
     *
     * @throws Exception
     */
    public function componentInitParent(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): ComponentRenderNode {
        return $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            self::INIT_MODE_PARENT,
            $options
        );
    }

    /**
     * @throws Exception
     */
    public function componentInitPrevious(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = []
    ): ComponentRenderNode {
        return $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            self::INIT_MODE_PREVIOUS,
            $options
        );
    }

    /**
     * @throws Exception
     */
    public function registerComponent(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        string $initMode,
        array $options = [],
    ): ComponentRenderNode {
        $componentManager = $this
            ->componentManagerLocatorService
            ->getComponentService($name);

        $component = $componentManager?->createComponent(
            $initMode,
            $options
        );

        if (! $component) {
            $component = new ComponentRenderNode(
                $initMode,
                $options
            );
        }

        $this->initRenderNode(
            $component,
            $renderPass,
            $name,
        );

        $this->componentRenderBody(
            $renderPass,
            $twig,
            $component
        );

        return $component;
    }
}
