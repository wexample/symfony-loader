<?php

namespace Wexample\SymfonyLoader\Service;

use Exception;
use Twig\Environment;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyLoader\Helper\ComponentPathHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;
use Wexample\SymfonyLoader\Rendering\ComponentManagerLocatorService;
use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle;
use Wexample\SymfonyTranslations\Translation\Translator;

class ComponentService extends AbstractRenderNodeService
{
    // Component is loaded with a css class.
    public const INIT_MODE_CLASS = VariableHelper::CLASS_VAR;

    // Component is simply loaded from PHP or from backend adaptive event. It may have no target tag.
    public const INIT_MODE_LAYOUT = VariableHelper::LAYOUT;

    // Component is loaded from template into the target tag.
    public const INIT_MODE_PARENT = VariableHelper::PARENT;

    // Component is loaded from template, just after target tag.
    public const INIT_MODE_PREVIOUS = VariableHelper::PREVIOUS;

    // Component is loaded from a frontend template clone.
    public const INIT_MODE_TEMPLATE = 'template';

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
        return BundleHelper::ALIAS_PREFIX . WexampleSymfonyLoaderBundle::getAlias() . '/' . $shortName;
    }

    /**
     * @throws Exception
     */
    public function componentRenderBody(
        RenderPass $renderPass,
        Environment $twig,
        ComponentRenderNode $component,
        array $templateVars = []
    ): string {
        $loader = $twig->getLoader();

        try {
            if ($loader->exists($component->getTemplatePath())) {
                $renderPass->setCurrentContextRenderNode(
                    $component
                );

                $domain = $component->getContextType();
                $component->addTranslationDomain(
                    $domain,
                    $this->translator->setDomainFromTemplatePath(
                        $domain,
                        $component->getView()
                    ),
                    $component->getView()
                );

                $component->render(
                    $twig,
                    [
                        'render_pass' => $renderPass,
                        'component' => $component,
                    ] + $templateVars
                );

                $this->translator->revertDomain(
                    Translator::DOMAIN_TYPE_COMPONENT
                );

                $renderPass->revertCurrentContextRenderNode();
            } else {
                $component->setBody(null);
            }

            return DomHelper::buildTag(
                tagName: DomHelper::TAG_SPAN,
                attributes: [
                    'style' => 'display:none',
                ]
            );
        } catch (Exception $exception) {
            throw new Exception('Error during rendering component ' . $component->getView() . ' : ' . $exception->getMessage(), $exception->getCode(), $exception);
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
        array $options = [],
        array $templateVars = []
    ): ComponentRenderNode {
        return $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            self::INIT_MODE_CLASS,
            $options,
            $templateVars,
            // The markup is already there — the caller is the component's own
            // template, asking for the class that will bind it. Rendering the
            // body here would draw the element a second time, inside itself,
            // with none of the options it was called with.
            renderBody: false,
        );
    }

    /**
     * @throws Exception
     */
    public function componentInitLayout(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = [],
        array $templateVars = []
    ): ComponentRenderNode {
        $component = $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            ComponentService::INIT_MODE_LAYOUT,
            $options,
            $templateVars
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
        array $options = [],
        array $templateVars = []
    ): ComponentRenderNode {
        return $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            self::INIT_MODE_PARENT,
            $options,
            $templateVars
        );
    }

    /**
     * @throws Exception
     */
    public function componentInitPrevious(
        Environment $twig,
        RenderPass $renderPass,
        string $name,
        array $options = [],
        array $templateVars = []
    ): ComponentRenderNode {
        return $this->registerComponent(
            $twig,
            $renderPass,
            $name,
            self::INIT_MODE_PREVIOUS,
            $options,
            $templateVars
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
        array $templateVars = [],
        bool $renderBody = true,
    ): ComponentRenderNode {
        $name = $this->componentManagerLocatorService->normalizeComponentName($name);

        // A component may be a file or a directory holding every renderer of
        // the same name. The caller does not say which, so it is settled once,
        // here: the view is what template, assets, translations and dom ids are
        // all derived from.
        $name = ComponentPathHelper::resolveView(
            $twig,
            $name,
            ($options['frontend'] ?? false) === true
                ? '.front' . TemplateHelper::TEMPLATE_FILE_EXTENSION
                : TemplateHelper::TEMPLATE_FILE_EXTENSION
        );

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

        if ($renderBody) {
            $this->componentRenderBody(
                $renderPass,
                $twig,
                $component,
                $templateVars
            );
        }

        return $component;
    }
}
