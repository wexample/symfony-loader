<?php

namespace Wexample\SymfonyLoader\Rendering;

use Wexample\Helpers\Helper\TextHelper;
use Wexample\PhpHtml\Helper\DomHelper;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyLoader\Rendering\Traits\WithDomId;
use Wexample\SymfonyLoader\Rendering\Traits\WithView;
use Wexample\SymfonyLoader\Service\AssetsRegistryService;

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

    /**
     * Logical manifest key (e.g. build/@Bundle/js/components/modal.js).
     * Stays un-hashed: server-side Twig `asset()` resolves it through the
     * Encore manifest, and it is the stable identity used to dedup assets.
     */
    public string $path;

    /**
     * Resolved public URL the browser must request (the manifest VALUE, e.g.
     * /build/@Bundle/js/components/modal.6dc78917.js in prod). The client-side
     * loader injects assets dynamically and never goes through Twig `asset()`,
     * so without this it would request the un-hashed `path` and 404 in prod.
     */
    public string $publicPath;

    public string $type;

    public array $usages = [];

    public function __construct(
        string $pathInManifest,
        string $publicPath,
        protected string $usage,
        protected string $context
    ) {
        $info = pathinfo($pathInManifest);
        $this->type = $info['extension'];
        $this->path = $pathInManifest;
        $this->publicPath = $publicPath;

        $pathIdentity = TextHelper::trimFirstChunk(
            FileHelper::removeExtension($this->path),
            AssetsRegistryService::DIR_BUILD
        );

        // Same as render node id
        $this->setView(
            $this->buildView($pathIdentity)
        );

        // The file, and not the component it belongs to: one directory holds a
        // component's script and its vue twin, and the view drops the segment
        // that tells them apart, so an id built on the view would be the same
        // string on both tags and every lookup by it would find only the first.
        $this->setDomId(
            $this->type.'-'.DomHelper::buildStringIdentifier($pathIdentity)
        );
    }

    /**
     * The name a render node answers to: the file's, minus the segment saying
     * what it was compiled from — `js`, `vue`, `css`. Several files share one
     * view on purpose; none of them share an identity.
     */
    private function buildView(string $pathIdentity): string
    {
        $explode = explode('/', $pathIdentity);
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

    public function toRenderData(): \Wexample\SymfonyLoader\Rendering\RenderData
    {
        return \Wexample\SymfonyLoader\Rendering\RenderData::fromArray(
            $this->serializeVariables([
            'active',
            'context',
            'domId',
            'initialLayout',
            'path',
            'publicPath',
            'type',
            'usage',
            'usages',
            'view',
            ])
        );
    }

    public function getContext(): string
    {
        return $this->context;
    }
}
