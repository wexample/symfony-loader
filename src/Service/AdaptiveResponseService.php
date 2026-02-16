<?php

namespace Wexample\SymfonyLoader\Service;

use Symfony\Component\HttpFoundation\Request;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyLoader\Helper\AdaptiveRequestHelper;

class AdaptiveResponseService
{
    private array $allowedBases = [
        RenderPass::BASE_MODAL,
        RenderPass::BASE_PANEL,
        RenderPass::BASE_OVERLAY,
        RenderPass::BASE_PAGE,
        RenderPass::BASE_DEFAULT,
    ];

    private const string QUERY_STRING_CONFIG_KEY_FORMAT = '__format';
    private const string QUERY_STRING_CONFIG_KEY_LAYOUT = '__layout';

    public function getLayoutBasePath(RenderPass $renderPass): string
    {
        return RenderPass::BASES_MAIN_DIR
            . $renderPass->getOutputType()
            . FileHelper::FOLDER_SEPARATOR
            . $renderPass->getLayoutBase()
            . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    public function initializeRequestAttributes(Request $request): void
    {
        if (!$request->attributes->has(AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE)) {
            $request->attributes->set(
                AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE,
                $this->detectOutputTypeFromRequest($request)
            );
        }

        if (!$request->attributes->has(AdaptiveRequestHelper::REQUEST_ATTR_LAYOUT_BASE)) {
            $outputType = $request->attributes->get(AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE);
            $outputType = is_string($outputType) ? $outputType : RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
            $request->attributes->set(
                AdaptiveRequestHelper::REQUEST_ATTR_LAYOUT_BASE,
                $this->detectLayoutBaseFromRequest($request, $outputType)
            );
        }
    }

    private function detectOutputTypeFromRequest(Request $request): string
    {
        if ($forcedFormat = $request->query->get(self::QUERY_STRING_CONFIG_KEY_FORMAT)) {
            if (in_array($forcedFormat, RenderPass::OUTPUT_TYPES, true)) {
                return $forcedFormat;
            }
        }

        return $request->isXmlHttpRequest()
            ? RenderPass::OUTPUT_TYPE_RESPONSE_JSON
            : RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
    }

    private function detectLayoutBaseFromRequest(Request $request, string $outputType): string
    {
        if ($outputType === RenderPass::OUTPUT_TYPE_RESPONSE_JSON) {
            $base = $request->query->get(
                self::QUERY_STRING_CONFIG_KEY_LAYOUT,
                RenderPass::BASE_MODAL
            );

            return in_array($base, $this->allowedBases, true)
                ? $base
                : RenderPass::BASE_MODAL;
        }

        return RenderPass::BASE_DEFAULT;
    }
}
