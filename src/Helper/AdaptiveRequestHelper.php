<?php

namespace Wexample\SymfonyLoader\Helper;

use Symfony\Component\HttpFoundation\Request;
use Wexample\SymfonyLoader\Rendering\RenderPass;

class AdaptiveRequestHelper
{
    public const string REQUEST_ATTR_OUTPUT_TYPE = '_adaptive_output_type';
    public const string REQUEST_ATTR_LAYOUT_BASE = '_adaptive_layout_base';
    public const string QUERY_STRING_CONFIG_KEY_FORMAT = '__format';
    public const string QUERY_STRING_CONFIG_KEY_LAYOUT = '__layout';

    private static array $allowedBases = [
        RenderPass::BASE_MODAL,
        RenderPass::BASE_PANEL,
        RenderPass::BASE_OVERLAY,
        RenderPass::BASE_PAGE,
        RenderPass::BASE_DEFAULT,
    ];

    public static function getOutputType(Request $request): ?string
    {
        $value = $request->attributes->get(self::REQUEST_ATTR_OUTPUT_TYPE);
        return is_string($value) ? $value : null;
    }

    public static function getLayoutBase(Request $request): ?string
    {
        $value = $request->attributes->get(self::REQUEST_ATTR_LAYOUT_BASE);
        return is_string($value) ? $value : null;
    }

    public static function isEmbedded(Request $request): bool
    {
        $base = self::getLayoutBase($request);

        return is_string($base)
            && !in_array($base, [RenderPass::BASE_PAGE, RenderPass::BASE_DEFAULT], true);
    }

    public static function initializeRequestAttributes(Request $request): void
    {
        if (!$request->attributes->has(self::REQUEST_ATTR_OUTPUT_TYPE)) {
            $request->attributes->set(
                self::REQUEST_ATTR_OUTPUT_TYPE,
                self::detectOutputTypeFromRequest($request)
            );
        }

        if (!$request->attributes->has(self::REQUEST_ATTR_LAYOUT_BASE)) {
            $outputType = $request->attributes->get(self::REQUEST_ATTR_OUTPUT_TYPE);
            $outputType = is_string($outputType) ? $outputType : RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
            $request->attributes->set(
                self::REQUEST_ATTR_LAYOUT_BASE,
                self::detectLayoutBaseFromRequest($request, $outputType)
            );
        }
    }

    private static function detectOutputTypeFromRequest(Request $request): string
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

    private static function detectLayoutBaseFromRequest(Request $request, string $outputType): string
    {
        if ($outputType === RenderPass::OUTPUT_TYPE_RESPONSE_JSON) {
            $base = $request->query->get(
                self::QUERY_STRING_CONFIG_KEY_LAYOUT,
                RenderPass::BASE_MODAL
            );

            return in_array($base, self::$allowedBases, true)
                ? $base
                : RenderPass::BASE_MODAL;
        }

        return RenderPass::BASE_DEFAULT;
    }
}
