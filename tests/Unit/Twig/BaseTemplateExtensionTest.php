<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Twig\TwigFunction;
use Wexample\SymfonyLoader\Twig\BaseTemplateExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class BaseTemplateExtensionTest extends TestCase
{
    public function testFunctionsAndTitleRendering(): void
    {
        $translator = $this->createStub(Translator::class);
        $translator->method('trans')->willReturnMap([
            [BaseTemplateExtension::DEFAULT_LAYOUT_TITLE_TRANSLATION_KEY, [], null, 'layout'],
            [BaseTemplateExtension::DEFAULT_APP_TITLE_TRANSLATION_KEY, [], null, 'app'],
            [BaseTemplateExtension::DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY, [], null, 'desc'],
        ]);

        $requestStack = new RequestStack();
        $requestStack->push(Request::create('http://localhost/foo?bar=baz'));

        $extension = new BaseTemplateExtension($translator, $requestStack);

        $functions = $extension->getFunctions();
        $names = array_map(static fn (TwigFunction $f) => $f->getName(), $functions);
        $this->assertContains('base_template_render_title', $names);
        $this->assertContains('base_template_render_meta', $names);
        $this->assertContains('base_template_render_canonical', $names);

        $this->assertSame('layout | app', $extension->baseTemplateRenderTitle());
        $this->assertSame('customDoc', $extension->baseTemplateRenderTitle(documentTitle: 'customDoc'));
        $this->assertSame('customLayout | app', $extension->baseTemplateRenderTitle(layoutTitle: 'customLayout'));
        $this->assertSame('layout | customApp', $extension->baseTemplateRenderTitle(appTitle: 'customApp'));

        $this->assertSame('http://localhost/foo', $extension->baseTemplateRenderCanonical());
        $this->assertSame('https://example.com/bar', $extension->baseTemplateRenderCanonical('https://example.com/bar'));

        $meta = $extension->baseTemplateRenderMeta(['description' => 'override']);
        $this->assertStringContainsString('name="description"', $meta);
        $this->assertStringContainsString('content="override"', $meta);
    }
}
