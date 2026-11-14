<?php

namespace Wexample\SymfonyLoader\Twig;

use Wexample\SymfonyTemplate\Twig\SystemExtension as TemplateSystemExtension;

/**
 * @deprecated `system_version` belongs to symfony-template, which this package
 * depends on; use Wexample\SymfonyTemplate\Twig\SystemExtension. Kept for code
 * naming this class, and no longer registered as a service: an app with both
 * bundles had the function registered twice. The loader's services.yaml
 * registers the template's extension instead.
 */
class SystemExtension extends TemplateSystemExtension
{
}
