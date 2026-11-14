<?php

declare(strict_types=1);

namespace Wexample\SymfonyLoader\Tests\Integration;

use Twig\Environment;
use Wexample\SymfonyLoader\Twig\SystemExtension as LoaderSystemExtension;
use Wexample\SymfonyTemplate\Twig\SystemExtension;
use Wexample\SymfonyTesting\Tests\AbstractSymfonyKernelTestCase;

/**
 * `system_version` is symfony-template's: the loader registers that extension
 * rather than its own copy, so an app without the template bundle still has
 * the function, and one with both has it once.
 */
class SystemVersionTest extends AbstractSymfonyKernelTestCase
{
    public function testTheFunctionComesFromTheTemplateExtension(): void
    {
        self::bootKernel();
        /** @var Environment $twig */
        $twig = self::getContainer()->get('twig');

        $this->assertTrue($twig->hasExtension(SystemExtension::class));
        $this->assertFalse($twig->hasExtension(LoaderSystemExtension::class));

        $callable = $twig->getFunction('system_version')?->getCallable();
        $this->assertIsArray($callable);
        $this->assertSame(SystemExtension::class, $callable[0]::class);
    }
}
