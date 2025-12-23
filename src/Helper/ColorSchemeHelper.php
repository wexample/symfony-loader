<?php

namespace Wexample\SymfonyDesignSystem\Helper;

class ColorSchemeHelper
{
    public const SCHEME_DARK = 'dark';

    /** @var string Default theme can be a mix of light and dark. */
    public const SCHEME_DEFAULT = 'default';

    public const SCHEME_LIGHT = 'light';

    public const SCHEME_PRINT = 'print';

    public const SCHEMES = [
        ColorSchemeHelper::SCHEME_DARK,
        ColorSchemeHelper::SCHEME_DEFAULT,
        ColorSchemeHelper::SCHEME_LIGHT,
        ColorSchemeHelper::SCHEME_PRINT,
    ];
}
