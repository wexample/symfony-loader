<?php

namespace Wexample\SymfonyLoader\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Wexample\Helpers\Helper\ClassHelper;
use Wexample\SymfonyLoader\Interface\LoaderBundleInterface;
use Wexample\SymfonyHelpers\DependencyInjection\AbstractWexampleSymfonyExtension;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyHelpers\Helper\VariableHelper;

class WexampleSymfonyLoaderExtension extends AbstractWexampleSymfonyExtension
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
        $translationPaths = $container->hasParameter('translations_paths')
            ? (array) $container->getParameter('translations_paths')
            : [];

        $container->setParameter(
            'wexample_symfony_loader.tsconfig_path',
            $config['tsconfig_path'] ?? null
        );

        if (!empty($config['default_color_scheme'])) {
            $colorSchemeConfig = $container->hasParameter('loader.usages.color_scheme')
                ? (array) $container->getParameter('loader.usages.color_scheme')
                : [];
            $colorSchemeConfig['default'] = $config['default_color_scheme'];
            $container->setParameter('loader.usages.color_scheme', $colorSchemeConfig);
        }

        $bundles = $container->getParameter('kernel.bundles');
        $paths = [];

        foreach ($config['front_paths'] ?? [] as $frontPath) {
            // Ignore invalid paths.
            if ($realpath = realpath($frontPath)) {
                $paths[VariableHelper::APP][] =
                $translationPaths[] = $realpath.FileHelper::FOLDER_SEPARATOR;
            }
        }

        foreach ($bundles as $class) {
            if (ClassHelper::classImplementsInterface(
                $class,
                LoaderBundleInterface::class
            )) {
                $bundleFronts = $class::getLoaderFrontPaths();

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
        $container->setParameter('loader_packages_front_paths', $paths);
    }
}
