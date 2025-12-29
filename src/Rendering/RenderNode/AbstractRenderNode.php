<?php

namespace Wexample\SymfonyLoader\Rendering\RenderNode;

use Wexample\SymfonyLoader\Helper\DomHelper;
use Wexample\SymfonyLoader\Helper\RenderingHelper;
use Wexample\SymfonyLoader\Rendering\Asset;
use Wexample\SymfonyLoader\Rendering\RenderDataGenerator;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Rendering\Traits\WithView;
use Wexample\SymfonyLoader\Service\AssetsService;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyTranslations\Translation\Translator;

abstract class AbstractRenderNode extends RenderDataGenerator
{
    use WithView;

    public array $assets = AssetsService::ASSETS_DEFAULT_EMPTY;

    public array $components = [];

    public string $cssClassName;

    protected string $id;

    protected bool $hasAssets = true;

    public array $translations = [];

    protected array $translationsDomains = [];

    protected array $vars = [];

    public array $usages;

    private array $inheritanceStack = [];

    abstract public function getContextType(): string;

    public function init(
        RenderPass $renderPass,
        string $view,
    ): void {
        // Inherit parent translation domains if any to allow alias resolution up the render tree.
        if ($parent = $renderPass->getCurrentContextRenderNode()) {
            $this->translationsDomains = $parent->getTranslationsDomains();
        }

        $this->setDefaultView($view);

        $this->id = implode('-', [
            $this->getContextType(),
            str_replace('/', '-', $this->getView()),
            uniqid(),
        ]);

        $this->usages = $renderPass->usages;
        $this->cssClassName = DomHelper::buildStringIdentifier($this->id);

        $domain = \Wexample\SymfonyTemplate\Helper\TemplateHelper::trimPathPrefix(
            $this->getView()
        );
        $this->addTranslationDomain(
            $domain,
            Translator::buildDomainFromTemplatePath(
                $domain
            ),
            $this->getView()
        );

        $renderPass->registerContextRenderNode($this);
        $renderPass->registerRenderNode($this);
    }

    public function addTranslationDomain(
        string $alias,
        string $target,
        ?string $view = null
    ):void
    {
        $viewKey = $view ?? $alias;

        // Keep first mapping per alias+view to avoid overwriting.
        if (isset($this->translationsDomains[$alias][$viewKey])) {
            return;
        }

        $this->translationsDomains[$alias][$viewKey] = $target;
    }

    public function getTranslationsDomains(): array
    {
        return $this->translationsDomains;
    }

    public function getContextRenderNodeKey(): string
    {
        return RenderingHelper::buildRenderContextKey(
            $this->getContextType(),
            $this->getView()
        );
    }

    public function getComponentsTemplates(): ?string
    {
        $output = [];

        /** @var ComponentRenderNode $component */
        foreach ($this->components as $component) {
            if ($component->getBody()) {
                $output[] = $component->getBody();
            }
        }

        return !empty($output) ? implode($output) : null;
    }

    public function setVars(array $vars): void
    {
        $this->vars = $vars;
    }

    public function setVar(
        string $key,
        mixed $value
    ): void
    {
        $this->vars[$key] = $value;
    }

    public function getVars(): array
    {
        return $this->vars;
    }

    public function toRenderData(): array
    {
        $data = [
            'components' => $this->arrayToRenderData($this->components),
            'cssClassName' => $this->cssClassName,
            'contextType' => $this->getContextType(),
            'id' => $this->id,
            'translations' => (object) $this->translations,
            'translationDomains' => $this->getTranslationsDomains(),
            'view' => $this->getView(),
            'vars' => (object) $this->vars,
            'usages' => (object) $this->usages,
        ];

        if ($this->hasAssets) {
            $data['assets'] = [
                Asset::EXTENSION_CSS => $this->arrayToRenderData($this->assets[Asset::EXTENSION_CSS]),
                Asset::EXTENSION_JS => $this->arrayToRenderData($this->assets[Asset::EXTENSION_JS]),
            ];
        }

        return $data;
    }

    public function setDefaultView(string $view): void
    {
        $view = TemplateHelper::removeExtension($view);

        if (!$this->getView()) {
            $this->setView($view);
        }

        $this->inheritanceStack[] = $view;
    }

    public function getInheritanceStack(): array
    {
        return $this->inheritanceStack;
    }

    public function hasAssets(): bool
    {
        return $this->hasAssets;
    }

    public function setHasAssets(bool $hasAssets): void
    {
        $this->hasAssets = $hasAssets;
    }
}
