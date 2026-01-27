<?php

namespace Wexample\SymfonyLoader\Rendering;

use Symfony\Component\DependencyInjection\ServiceLocator;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyLoader\Rendering\ComponentManager\AbstractComponentManager;
use Wexample\SymfonyLoader\Helper\LoaderHelper;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\Helpers\Helper\TextHelper;

readonly class ComponentManagerLocatorService
{
    public function __construct(
        private ServiceLocator $serviceLocator,
        private KernelInterface $kernel
    ) {

    }

    public function getComponentService(string $componentName): ?AbstractComponentManager
    {
        $componentName = $this->normalizeComponentName($componentName);
        $parts = explode('/', $componentName);
        $componentClassPath = 'App';

        if ($componentName[0] === BundleHelper::ALIAS_PREFIX) {
            $bundles = $this->kernel->getBundles();
            $bundleName = ltrim($parts[0], BundleHelper::ALIAS_PREFIX);
            if (isset($bundles[$bundleName])) {
                $class = new \ReflectionClass($bundles[$bundleName]);
                $componentClassPath = $class->getNamespaceName();
            }
        }

        $componentClassPath .= '\\Rendering\\ComponentManager\\'.TextHelper::toClass(end($parts).'ComponentManager');

        if (class_exists($componentClassPath)) {
            return $this->serviceLocator->get($componentClassPath);
        }

        return null;
    }

    public function normalizeComponentName(string $componentName): string
    {
        if ($componentName[0] !== BundleHelper::ALIAS_PREFIX) {
            return $componentName;
        }

        $parts = explode('/', $componentName);
        $bundleIdentifier = ltrim($parts[0], BundleHelper::ALIAS_PREFIX);

        if (in_array($bundleIdentifier, [
            LoaderHelper::TWIG_NAMESPACE_FRONT,
            LoaderHelper::TWIG_NAMESPACE_ASSETS,
        ], true)) {
            return $componentName;
        }

        // Already a bundle short name like "@WexampleSymfonyLoaderBundle".
        if (str_ends_with($bundleIdentifier, 'Bundle')) {
            return $componentName;
        }

        $bundle = BundleHelper::getBundle($bundleIdentifier, $this->kernel);

        if (! $bundle) {
            return $componentName;
        }

        $parts[0] = BundleHelper::ALIAS_PREFIX . $bundle->getName();

        return implode('/', $parts);
    }
}
