<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\App;

use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;
use Wexample\SymfonyTesting\Tests\Fixtures\AbstractFixtureKernel;

class AppKernel extends AbstractFixtureKernel
{
    protected function getFixtureDir(): string
    {
        return __DIR__;
    }

    protected function getExtraBundles(): iterable
    {
        return [
            new \Wexample\SymfonyLoader\WexampleSymfonyLoaderBundle(),
            new \Wexample\SymfonyTranslations\WexampleSymfonyTranslationsBundle(),
        ];
    }

    protected function getConfigFiles(): array
    {
        return [
            __DIR__ . '/config/config.yaml',
        ];
    }

    protected function configureRoutes(RoutingConfigurator $routes): void
    {
        parent::configureRoutes($routes);

        $routes->import(__DIR__ . '/Controller/', 'attribute');

        // What an application imports to look at its error pages, and what
        // asks this bundle's error controller for the page rather than for the
        // exception.
        $routes
            ->import('@FrameworkBundle/Resources/config/routing/errors.php')
            ->prefix('/_error');
    }
}
