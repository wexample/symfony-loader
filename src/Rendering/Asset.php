<?php

namespace Wexample\SymfonyDesignSystem\Rendering;

use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyDesignSystem\Helper\DomHelper;
use Wexample\SymfonyDesignSystem\Rendering\Traits\WithDomId;
use Wexample\SymfonyDesignSystem\Rendering\Traits\WithView;
use Wexample\SymfonyDesignSystem\Service\AssetsRegistryService;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class Asset extends RenderDataGenerator
{
    use WithDomId;
    use WithView;

    public const ASSETS_EXTENSIONS = [
        Asset::EXTENSION_CSS,
        Asset::EXTENSION_JS,
    ];

    public const CONTEXT_LAYOUT = 'layout';

    public const CONTEXT_PAGE = 'page';

    public const CONTEXT_COMPONENT = 'component';

    public const CONTEXTS = [
        self::CONTEXT_LAYOUT,
        self::CONTEXT_PAGE,
        self::CONTEXT_COMPONENT,
    ];

    public const EXTENSION_CSS = 'css';

    public const EXTENSION_JS = 'js';

    public bool $active = false;

    public bool $initialLayout = false;

    public string $media = 'screen';

    public string $path;

    public string $type;

    public array $usages = [];

    public function __construct(
        string $pathInManifest,
        string $view,
        protected string $usage,
        protected string $context
    ) {
        $info = pathinfo($pathInManifest);
        $this->type = $info['extension'];
        $this->path = $pathInManifest;

        // Same as render node id
        $this->setView($view);

        $this->setDomId(
            $this->type.'-'.DomHelper::buildStringIdentifier($this->getView())
        );
    }

    private function buildView(string $path): string
    {
        $path = TextHelper::trimFirstChunk(
            FileHelper::removeExtension($path),
            AssetsRegistryService::DIR_BUILD
        );

        $explode = explode('/', $path);
        $parts = array_slice($explode, 2);
        array_unshift($parts, current($explode));

        return implode('/', $parts);
    }

    public function setServerSideRendered(bool $bool = true)
    {
        $this->active =
        $this->initialLayout = $bool;
    }

    public function getUsage(): string
    {
        return $this->usage;
    }

    public function isServerSideRendered(): bool
    {
        return $this->active
            && $this->initialLayout;
    }

    public function toRenderData(): array
    {
        return $this->serializeVariables([
            'active',
            'context',
            'domId',
            'initialLayout',
            'path',
            'type',
            'usage',
            'usages',
            'view',
        ]);
    }

    public function getContext(): string
    {
        return $this->context;
    }
}
