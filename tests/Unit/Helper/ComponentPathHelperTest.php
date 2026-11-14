<?php

declare(strict_types=1);

namespace Wexample\SymfonyLoader\Tests\Unit\Helper;

use PHPUnit\Framework\TestCase;
use Twig\Environment;
use Twig\Loader\ArrayLoader;
use Wexample\SymfonyLoader\Helper\ComponentPathHelper;

/**
 * The two shapes a component may be in: a folder holding its renderers, or
 * the older flat file.
 */
class ComponentPathHelperTest extends TestCase
{
    public function testFoldRepeatsTheNameInsideItsFolder(): void
    {
        $this->assertSame('components/button/button', ComponentPathHelper::fold('components/button'));
        $this->assertSame('@Bundle/components/form/select/select', ComponentPathHelper::fold('@Bundle/components/form/select'));
        $this->assertSame('button/button', ComponentPathHelper::fold('button'));
    }

    public function testAFolderTemplateIsPreferred(): void
    {
        $twig = new Environment(new ArrayLoader([
            'components/button/button.html.twig' => '',
            'components/button.html.twig' => '',
        ]));

        $this->assertSame(
            'components/button/button',
            ComponentPathHelper::resolveView($twig, 'components/button', '.html.twig')
        );
    }

    public function testTheFlatNameStaysWithoutAFolderTemplate(): void
    {
        $twig = new Environment(new ArrayLoader([
            'components/button.html.twig' => '',
            // Another extension in the folder does not count.
            'components/button/button.vue.twig' => '',
        ]));

        $this->assertSame(
            'components/button',
            ComponentPathHelper::resolveView($twig, 'components/button', '.html.twig')
        );
        $this->assertSame(
            'components/button/button',
            ComponentPathHelper::resolveView($twig, 'components/button', '.vue.twig')
        );
    }
}
