<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\App;

use Symfony\Component\Config\Loader\LoaderInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Wexample\SymfonyTesting\Tests\TestKernel;

class AppKernel extends TestKernel
{
    public function registerBundles(): iterable
    {
        yield from parent::registerBundles();

        yield new \Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle();
        yield new \Wexample\SymfonyTranslations\WexampleSymfonyTranslationsBundle();
    }

    protected function configureContainer(
        ContainerBuilder $container,
        LoaderInterface $loader
    ): void {
        parent::configureContainer($container, $loader);

        $loader->load(__DIR__.'/config/config.yaml');
    }

    public function getProjectDir(): string
    {
        return __DIR__;
    }
}
