<?php

namespace Wexample\SymfonyLoader\Helper;

use Symfony\Component\HttpFoundation\Request;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\AdaptiveResponseService;

class AdaptiveRequestHelper
{
    public static function getOutputType(Request $request): ?string
    {
        $value = $request->attributes->get(AdaptiveResponseService::REQUEST_ATTR_OUTPUT_TYPE);
        return is_string($value) ? $value : null;
    }

    public static function getLayoutBase(Request $request): ?string
    {
        $value = $request->attributes->get(AdaptiveResponseService::REQUEST_ATTR_LAYOUT_BASE);
        return is_string($value) ? $value : null;
    }

    public static function isEmbedded(Request $request): bool
    {
        $base = self::getLayoutBase($request);

        return is_string($base)
            && !in_array($base, [RenderPass::BASE_PAGE, RenderPass::BASE_DEFAULT], true);
    }
}
