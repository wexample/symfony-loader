<?php

namespace Wexample\SymfonyLoader\Service;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class AdaptiveResponseService
{
    public const string REQUEST_ATTR_OUTPUT_TYPE = '_adaptive_output_type';
    public const string REQUEST_ATTR_LAYOUT_BASE = '_adaptive_layout_base';

    protected array $allowedBases = [
        RenderPass::BASE_MODAL,
        RenderPass::BASE_PANEL,
        RenderPass::BASE_OVERLAY,
        RenderPass::BASE_PAGE,
        RenderPass::BASE_DEFAULT,
    ];

    public const string QUERY_STRING_CONFIG_KEY_FORMAT = '__format';
    public const string QUERY_STRING_CONFIG_KEY_LAYOUT = '__layout';

    public function __construct(
        private readonly RequestStack $requestStack,
    )
    {
    }

    private function getCurrentRequest(): ?Request
    {
        return $this->requestStack->getCurrentRequest();
    }

    public function getOutputType(): string
    {
        $request = $this->getCurrentRequest();
        if (!$request) {
            return RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
        }

        $cached = $request->attributes->get(self::REQUEST_ATTR_OUTPUT_TYPE);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $outputType = $this->detectOutputType();
        $request->attributes->set(self::REQUEST_ATTR_OUTPUT_TYPE, $outputType);

        return $outputType;
    }

    private function getQueryStringConfigValue(
        string $key,
        ?string $default = null
    ): ?string
    {
        return $this->getCurrentRequest()->query->get($key, $default);
    }

    public function getLayoutBase(): string
    {
        $request = $this->getCurrentRequest();
        if (!$request) {
            return RenderPass::BASE_DEFAULT;
        }

        $cached = $request->attributes->get(self::REQUEST_ATTR_LAYOUT_BASE);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $layoutBase = $this->detectLayoutBase($this->getOutputType());
        $request->attributes->set(self::REQUEST_ATTR_LAYOUT_BASE, $layoutBase);

        return $layoutBase;
    }

    public function getLayoutBasePath(RenderPass $renderPass): string
    {
        return RenderPass::BASES_MAIN_DIR
            . $renderPass->getOutputType()
            . FileHelper::FOLDER_SEPARATOR
            . $renderPass->getLayoutBase()
            . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    private function detectOutputType(): string
    {
        if ($forcedFormat = $this->getQueryStringConfigValue(
            AdaptiveResponseService::QUERY_STRING_CONFIG_KEY_FORMAT
        )) {
            if (in_array($forcedFormat, RenderPass::OUTPUT_TYPES)) {
                return $forcedFormat;
            }
        }

        return $this->getCurrentRequest()->isXmlHttpRequest() ?
            RenderPass::OUTPUT_TYPE_RESPONSE_JSON :
            RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
    }

    private function detectLayoutBase(string $outputType): string
    {
        if ($outputType === RenderPass::OUTPUT_TYPE_RESPONSE_JSON) {
            $base = $this->getQueryStringConfigValue(
                AdaptiveResponseService::QUERY_STRING_CONFIG_KEY_LAYOUT,
                RenderPass::BASE_MODAL
            );

            return in_array($base, $this->allowedBases, true)
                ? $base
                : RenderPass::BASE_MODAL;
        }

        return RenderPass::BASE_DEFAULT;
    }
}
