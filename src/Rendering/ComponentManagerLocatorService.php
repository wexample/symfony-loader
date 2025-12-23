<?php

namespace Wexample\SymfonyDesignSystem\Rendering;

use Symfony\Component\DependencyInjection\ServiceLocator;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\Helpers\Helper\TextHelper;
use Wexample\SymfonyDesignSystem\Rendering\ComponentManager\AbstractComponentManager;
use Wexample\SymfonyHelpers\Helper\BundleHelper;

readonly class ComponentManagerLocatorService
{
    public function __construct(
        private ServiceLocator $serviceLocator,
        private KernelInterface $kernel
    ) {

    }

    public function getComponentService(string $componentName): ?AbstractComponentManager
    {
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
}
