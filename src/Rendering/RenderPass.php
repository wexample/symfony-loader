<?php

namespace Wexample\SymfonyDesignSystem\Rendering;

use Wexample\SymfonyDesignSystem\Helper\DesignSystemHelper;
use Wexample\SymfonyDesignSystem\Helper\RenderingHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyDesignSystem\Rendering\RenderNode\AjaxLayoutRenderNode;
use Wexample\SymfonyDesignSystem\Rendering\RenderNode\InitialLayoutRenderNode;
use Wexample\SymfonyDesignSystem\Rendering\Traits\WithRenderRequestId;
use Wexample\SymfonyDesignSystem\Rendering\Traits\WithView;
use Wexample\SymfonyDesignSystem\Service\Usage\ResponsiveAssetUsageService;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

class RenderPass
{
    use WithView;
    use WithRenderRequestId;

    public const BASE_DEFAULT = VariableHelper::DEFAULT;

    public const BASE_MODAL = VariableHelper::MODAL;

    public const BASE_PANEL = 'panel';

    public const BASE_OVERLAY = 'overlay';

    public const BASE_PAGE = VariableHelper::PAGE;

    public const BASES_MAIN_DIR = DesignSystemHelper::FOLDER_FRONT_ALIAS.'bases/';

    public const OUTPUT_TYPE_RESPONSE_HTML = VariableHelper::HTML;

    public const OUTPUT_TYPE_RESPONSE_JSON = VariableHelper::JSON;

    public const RENDER_PARAM_NAME_BASE = 'adaptive_base';

    public const RENDER_PARAM_NAME_OUTPUT_TYPE = 'adaptive_output_type';

    public InitialLayoutRenderNode|AjaxLayoutRenderNode $layoutRenderNode;

    protected array $contextRenderNodeRegistry = [];

    protected array $contextRenderNodeStack = [];

    public array $usagesConfig = [];

    public ?bool $enableAggregation = null;

    private bool $debug = false;

    private string $outputType = self::OUTPUT_TYPE_RESPONSE_HTML;

    protected string $layoutBase = self::BASE_DEFAULT;

    /**
     * @var array<string|null>
     */
    public array $usages = [];

    public array $registry = [
        RenderingHelper::CONTEXT_COMPONENT => [],
        RenderingHelper::CONTEXT_PAGE => [],
        RenderingHelper::CONTEXT_LAYOUT => [],
        RenderingHelper::CONTEXT_VUE => [],
    ];

    private bool $useJs = true;

    public function __construct()
    {
        $this->createRenderRequestId();
    }

    public function registerRenderNode(
        AbstractRenderNode $renderNode
    ) {
        $this->registry[$renderNode->getContextType()][$renderNode->getView()] = $renderNode;
    }

    public function createRenderRequestId(): string
    {
        $this->setRenderRequestId(uniqid());

        return $this->getRenderRequestId();
    }

    public function registerContextRenderNode(
        AbstractRenderNode $renderNode
    ) {
        $this->contextRenderNodeRegistry[$renderNode->getContextRenderNodeKey()] = $renderNode;
    }

    public function setCurrentContextRenderNode(
        AbstractRenderNode $renderNode
    ) {
        $this->setCurrentContextRenderNodeByTypeAndName(
            $renderNode->getContextType(),
            $renderNode->getView()
        );
    }

    public function setCurrentContextRenderNodeByTypeAndName(
        string $renderNodeType,
        string $renderNodeName
    ) {
        $key = RenderingHelper::buildRenderContextKey(
            $renderNodeType,
            $renderNodeName
        );

        $this->contextRenderNodeStack[] = $this->contextRenderNodeRegistry[$key];
    }

    public function getCurrentContextRenderNode(): ?AbstractRenderNode
    {
        return empty($this->contextRenderNodeStack) ? null : end($this->contextRenderNodeStack);
    }

    public function revertCurrentContextRenderNode(): void
    {
        array_pop($this->contextRenderNodeStack);
    }

    public function isUseJs(): bool
    {
        return $this->useJs;
    }

    public function setUseJs(bool $useJs): void
    {
        $this->useJs = $useJs;
    }

    public function getDisplayBreakpoints(): array
    {
        $usagesTypes = $this->usagesConfig[ResponsiveAssetUsageService::getName()]['list'];
        $breakpoints = [];

        foreach ($usagesTypes as $name => $config) {
            $breakpoints[$name] = $config['breakpoint'];
        }

        return $breakpoints;
    }

    public function getUsage(
        string $usageName,
    ): ?string {
        return $this->usages[$usageName];
    }

    public function setUsage(
        string $usageName,
        ?string $usageValue
    ): void {
        // Not found
        if (! isset($this->usagesConfig[$usageName])) {
            return;
        }

        $this->usages[$usageName] = $usageValue;
    }

    public function isDebug(): bool
    {
        return $this->debug;
    }

    public function setDebug(bool $debug): void
    {
        $this->debug = $debug;
    }

    public function setOutputType(string $type): self
    {
        $this->outputType = $type;

        return $this;
    }

    public function getOutputType(): string
    {
        return $this->outputType;
    }

    public function isJsonRequest(): bool
    {
        return self::OUTPUT_TYPE_RESPONSE_JSON === $this->getOutputType();
    }

    public function isHtmlRequest(): bool
    {
        return self::OUTPUT_TYPE_RESPONSE_HTML === $this->getOutputType();
    }

    public function getLayoutBase(): string
    {
        return $this->layoutBase;
    }

    public function setLayoutBase(string $layoutBase): void
    {
        $this->layoutBase = $layoutBase;
    }
}
