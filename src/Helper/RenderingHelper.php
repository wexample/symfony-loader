<?php

namespace Wexample\SymfonyDesignSystem\Helper;

use function implode;

use Wexample\SymfonyHelpers\Helper\VariableHelper;

class RenderingHelper
{
    public const CONTEXT_COMPONENT = VariableHelper::COMPONENT;

    public const CONTEXT_LAYOUT = VariableHelper::LAYOUT;

    public const CONTEXT_PAGE = VariableHelper::PAGE;

    public const CONTEXT_VUE = VariableHelper::VUE;

    public const PLACEHOLDER_PRELOAD_TAG = '<-- {{ ADAPTIVE_PRELOAD_PLACEHOLDER }} -->';

    public static function buildRenderContextKey(
        string $renderContextType,
        string $renderContextName
    ): string {
        return implode('@', [
            $renderContextType,
            $renderContextName,
        ]);
    }
}
