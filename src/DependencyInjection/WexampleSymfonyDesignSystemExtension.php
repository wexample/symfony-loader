<?php

namespace Wexample\SymfonyDesignSystem\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Wexample\Helpers\Helper\ClassHelper;
use Wexample\SymfonyDesignSystem\Interface\DesignSystemBundleInterface;
use Wexample\SymfonyHelpers\DependencyInjection\AbstractWexampleSymfonyExtension;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

class WexampleSymfonyDesignSystemExtension extends AbstractWexampleSymfonyExtension
{
    public function load(
        array $configs,
        ContainerBuilder $container
    ): void {
        $this->loadConfig(
            __DIR__,
            $container
        );

        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);
        $translationPaths = $container->getParameter('translations_paths');

        $bundles = $container->getParameter('kernel.bundles');
        $paths = [];

        foreach ($config['front_paths'] as $frontPath) {
            // Ignore invalid paths.
            if ($realpath = realpath($frontPath)) {
                $paths[VariableHelper::APP][] =
                $translationPaths[] = $realpath.FileHelper::FOLDER_SEPARATOR;
            }
        }

        foreach ($bundles as $class) {
            if (ClassHelper::classImplementsInterface(
                $class,
                DesignSystemBundleInterface::class
            )) {
                $bundleFronts = $class::getDesignSystemFrontPaths();

                $realPaths = [];
                foreach ($bundleFronts as $alias => $frontPath) {
                    $relativePath = realpath($frontPath).FileHelper::FOLDER_SEPARATOR;

                    if (is_string($alias)) {
                        $realPaths[$alias] = $relativePath;
                    } else {
                        $realPaths[] = $relativePath;
                    }

                    $translationPaths['@'.$class::getAlias()] = $relativePath;
                }

                $paths[$class] = $realPaths;
            }
        }

        // Save new paths
        $container->setParameter('translations_paths', $translationPaths);
        $container->setParameter('design_system_packages_front_paths', $paths);
    }
}
