<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyHelpers\Helper\TemplateHelper;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class AdaptiveResponseService
{
    protected array $allowedBases = [
        RenderPass::BASE_MODAL,
        RenderPass::BASE_PANEL,
        RenderPass::BASE_OVERLAY,
        RenderPass::BASE_PAGE,
        RenderPass::BASE_DEFAULT,
    ];

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

    public function detectOutputType(): string
    {
        return $this->getCurrentRequest()->isXmlHttpRequest() ?
            RenderPass::OUTPUT_TYPE_RESPONSE_JSON :
            RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
    }

    private function getQueryStringConfigValue(
        string $key,
        string $default
    ): ?string
    {
        return $this->getCurrentRequest()->query->get($key, $default);
    }

    public function detectLayoutBase(RenderPass $renderPass): string
    {
        // Layout not specified in query string.
        if ($renderPass->isJsonRequest()) {
            // Use modal as default ajax layout, but might be configurable.
            return $this->getQueryStringConfigValue(
                AdaptiveResponseService::QUERY_STRING_CONFIG_KEY_LAYOUT,
                RenderPass::BASE_MODAL
            );
        }

        return RenderPass::BASE_DEFAULT;
    }

    public function getLayoutBasePath(RenderPass $renderPass): string
    {
        return RenderPass::BASES_MAIN_DIR
            . $renderPass->getOutputType()
            . FileHelper::FOLDER_SEPARATOR
            . $renderPass->getLayoutBase()
            . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }
}
