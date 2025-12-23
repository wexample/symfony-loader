<?php

namespace Wexample\SymfonyDesignSystem\Rendering\RenderNode;

use Wexample\SymfonyDesignSystem\Helper\DomHelper;
use Wexample\SymfonyDesignSystem\Helper\RenderingHelper;
use Wexample\SymfonyDesignSystem\Rendering\Asset;
use Wexample\SymfonyDesignSystem\Rendering\RenderDataGenerator;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Rendering\Traits\WithView;
use Wexample\SymfonyDesignSystem\Service\AssetsService;
use Wexample\SymfonyHelpers\Helper\TemplateHelper;

abstract class AbstractRenderNode extends RenderDataGenerator
{
    use WithView;

    public array $assets = AssetsService::ASSETS_DEFAULT_EMPTY;

    public array $components = [];

    public string $cssClassName;

    protected string $id;

    public bool $hasAssets = true;

    public array $translations = [];

    public array $vars = [];

    public array $usages;

    private array $inheritanceStack = [];

    abstract public function getContextType(): string;

    public function init(
        RenderPass $renderPass,
        string $view,
    ): void {
        $this->setDefaultView($view);

        $this->id = implode('-', [
            $this->getContextType(),
            str_replace('/', '-', $this->getView()),
            uniqid(),
        ]);

        $this->usages = $renderPass->usages;
        $this->cssClassName = DomHelper::buildStringIdentifier($this->id);

        $renderPass->registerContextRenderNode($this);
        $renderPass->registerRenderNode($this);
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

        return ! empty($output) ? implode($output) : null;
    }

    public function toRenderData(): array
    {
        $data = [
            'components' => $this->arrayToRenderData($this->components),
            'cssClassName' => $this->cssClassName ?? null,
            'id' => $this->id ?? null,
            'translations' => (object) $this->translations,
            'view' => $this->getView(),
            'vars' => (object) $this->vars,
            'usages' => (object) ($this->usages ?? []),
        ];

        if ($this->hasAssets) {
            $data['assets'] = [
                Asset::EXTENSION_CSS => $this->arrayToRenderData($this->assets[Asset::EXTENSION_CSS] ?? []),
                Asset::EXTENSION_JS => $this->arrayToRenderData($this->assets[Asset::EXTENSION_JS] ?? []),
            ];
        }

        return $data;
    }

    public function setDefaultView(string $view): void
    {
        $view = TemplateHelper::removeExtension($view);

        if (! $this->getView()) {
            $this->setView($view);
        }

        $this->inheritanceStack[] = $view;
    }

    public function getInheritanceStack(): array
    {
        return $this->inheritanceStack;
    }
}
