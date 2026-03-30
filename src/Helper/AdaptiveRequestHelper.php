<?php

namespace Wexample\SymfonyLoader\Helper;

use Symfony\Component\HttpFoundation\Request;
use Wexample\SymfonyLoader\Rendering\RenderPass;

class AdaptiveRequestHelper
{
    public const string REQUEST_ATTR_OUTPUT_TYPE = '_adaptive_output_type';
    public const string REQUEST_ATTR_LAYOUT_BASE = '_adaptive_layout_base';

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

}
