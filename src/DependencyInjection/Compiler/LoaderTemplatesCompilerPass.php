<?php

namespace Wexample\SymfonyLoader\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Wexample\SymfonyHelpers\Class\AbstractBundle;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

class LoaderTemplatesCompilerPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        $definition = $container->getDefinition('twig.loader.native_filesystem');
        $bundlesPaths = $container->getParameter('loader_packages_front_paths');

        /**
         * @var AbstractBundle $bundleClass
         * @var array          $paths
         */
        foreach ($bundlesPaths as $bundleClass => $paths) {
            foreach ($paths as $path) {
                if ($bundleClass != VariableHelper::APP) {
                    # Add template alias like WexampleSymfonyLoaderBundle for every registered path.
                    $definition->addMethodCall(
                        'addPath',
                        [
                            $path,
                            class_exists($bundleClass) ?
                                $bundleClass::getAlias() : $bundleClass,
                        ]
                    );
                } else {
                    // Add also to allow find all "front" folder, as in translations extension.
                    $definition->addMethodCall(
                        'addPath',
                        [
                            $path,
                            basename($path),
                        ]
                    );
                }
            }
        }
    }
}
