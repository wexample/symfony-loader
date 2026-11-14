<?php

namespace Wexample\SymfonyLoader\Rendering;

use Symfony\Component\DependencyInjection\ServiceLocator;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyHelpers\Attribute\WorkerSafe;
use Wexample\SymfonyHelpers\Helper\BundleHelper;
use Wexample\SymfonyLoader\Helper\LoaderHelper;
use Wexample\SymfonyLoader\Rendering\ComponentManager\AbstractComponentManager;

class ComponentManagerLocatorService
{
    /**
     * The manager found for each component name, null where it has none:
     * asked for every component of every render, and decided by the bundles
     * and the registered managers only.
     *
     * @var array<string, AbstractComponentManager|null>
     */
    #[WorkerSafe('Derived from the kernel bundles and the tagged component managers, fixed for the container.')]
    private array $managers = [];

    public function __construct(
        private readonly ServiceLocator $serviceLocator,
        private readonly KernelInterface $kernel
    ) {

    }

    public function getComponentService(string $componentName): ?AbstractComponentManager
    {
        if (array_key_exists($componentName, $this->managers)) {
            return $this->managers[$componentName];
        }

        return $this->managers[$componentName] = $this->findComponentService($componentName);
    }

    private function findComponentService(string $componentName): ?AbstractComponentManager
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

        // The locator holds every manager there is: asking it first spares
        // the autoloader a lookup for each component that has none, and a
        // class that exists without being registered is no manager either.
        if ($this->serviceLocator->has($componentClassPath)) {
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
