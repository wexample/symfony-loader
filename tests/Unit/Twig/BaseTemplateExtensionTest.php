<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Twig\BaseTemplateExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class BaseTemplateExtensionTest extends TestCase
{
    private function extension(string $appDescription): BaseTemplateExtension
    {
        $translator = $this->createStub(Translator::class);
        $translator->method('trans')->willReturn($appDescription);

        return new BaseTemplateExtension($translator, new RequestStack());
    }

    public function testAnEmptyDescriptionFromThePageKeepsTheAppOne(): void
    {
        $this->assertSame(
            '<meta name="description" content="The app">',
            $this->extension('The app')->baseTemplateRenderMeta(['description' => null])
        );
    }

    public function testADescriptionFromThePageWins(): void
    {
        $this->assertSame(
            '<meta name="description" content="The page">',
            $this->extension('The app')->baseTemplateRenderMeta(['description' => 'The page'])
        );
    }
}
