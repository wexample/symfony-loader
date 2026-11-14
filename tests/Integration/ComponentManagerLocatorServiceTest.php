<?php

declare(strict_types=1);

namespace Wexample\SymfonyLoader\Tests\Integration;

use InvalidArgumentException;
use Symfony\Component\DependencyInjection\ServiceLocator;
use Wexample\SymfonyLoader\Rendering\ComponentManagerLocatorService;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

/**
 * How a component name is read — which bundle it belongs to — and which
 * manager, if any, builds its node.
 */
class ComponentManagerLocatorServiceTest extends AbstractSymfonyKernelTestCase
{
    private function getLocator(): ComponentManagerLocatorService
    {
        // No manager registered: what the suite's own bundles ship.
        return new ComponentManagerLocatorService(new ServiceLocator([]), self::bootKernel());
    }

    public function testNamesOutsideABundleAreLeftAlone(): void
    {
        $locator = $this->getLocator();

        $this->assertSame('components/button', $locator->normalizeComponentName('components/button'));
        $this->assertSame('@front/components/button', $locator->normalizeComponentName('@front/components/button'));
        $this->assertSame('@assets/components/button', $locator->normalizeComponentName('@assets/components/button'));
    }

    public function testABundleShortNameIsLeftAlone(): void
    {
        $this->assertSame(
            '@WexampleSymfonyLoaderBundle/components/button',
            $this->getLocator()->normalizeComponentName('@WexampleSymfonyLoaderBundle/components/button')
        );
    }

    public function testAnUnknownBundleIsRefused(): void
    {
        // ComponentService::exists() reads this as a component that is not.
        $this->expectException(InvalidArgumentException::class);
        $this->getLocator()->normalizeComponentName('@NoSuchThing/components/button');
    }

    public function testAClassThatIsNoRegisteredManagerIsNone(): void
    {
        // AbstractComponentManager exists where a "abstract" component's
        // manager would be, and is no service: no manager, not a failure.
        $locator = $this->getLocator();

        $this->assertNull($locator->getComponentService('@WexampleSymfonyLoaderBundle/components/abstract'));
        $this->assertNull($locator->getComponentService('@WexampleSymfonyLoaderBundle/components/abstract'));
        $this->assertNull($locator->getComponentService('@WexampleSymfonyLoaderBundle/components/button'));
    }
}
