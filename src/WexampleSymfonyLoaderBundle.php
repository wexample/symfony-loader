<?php

namespace Wexample\SymfonyLoader;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Wexample\SymfonyLoader\DependencyInjection\Compiler\LoaderTemplatesCompilerPass;
use Wexample\SymfonyHelpers\Interface\LoaderBundleInterface;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Helper\BundleHelper;

class WexampleSymfonyLoaderBundle extends AbstractBundle implements LoaderBundleInterface
{
    public static function getLoaderFrontPaths(): array
    {
        return [
            BundleHelper::getBundleCssAlias(static::class) => __DIR__.'/../assets/',
        ];
    }

    public function build(ContainerBuilder $container): void
    {
        parent::build($container);

        $container->addCompilerPass(
            new LoaderTemplatesCompilerPass()
        );
    }
}
