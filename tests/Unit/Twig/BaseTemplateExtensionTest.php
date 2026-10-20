<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Twig;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\RequestStack;
use Wexample\SymfonyLoader\Twig\BaseTemplateExtension;
use Wexample\SymfonyTranslations\Translation\Translator;

class BaseTemplateExtensionTest extends TestCase
{
    /**
     * @param array<string, string> $catalogue An undefined key answers itself, as the translator does
     */
    private function extension(array $catalogue): BaseTemplateExtension
    {
        $translator = $this->createStub(Translator::class);
        $translator->method('trans')->willReturnCallback(
            static fn (string $key): string => $catalogue[$key] ?? $key
        );

        return new BaseTemplateExtension($translator, new RequestStack());
    }

    private function app(): array
    {
        return [BaseTemplateExtension::DEFAULT_APP_DESCRIPTION_TRANSLATION_KEY => 'The app'];
    }

    public function testAnEmptyDescriptionFromThePageKeepsTheAppOne(): void
    {
        $this->assertSame(
            '<meta name="description" content="The app">',
            $this->extension($this->app())->baseTemplateRenderMeta(['description' => null])
        );
    }

    public function testADescriptionFromThePageWins(): void
    {
        $this->assertSame(
            '<meta name="description" content="The page">',
            $this->extension($this->app())->baseTemplateRenderMeta(['description' => 'The page'])
        );
    }

    public function testThePageTranslationComesBeforeTheAppOne(): void
    {
        $extension = $this->extension($this->app() + [
            BaseTemplateExtension::DEFAULT_PAGE_DESCRIPTION_TRANSLATION_KEY => 'The page file',
        ]);

        $this->assertSame(
            '<meta name="description" content="The page file">',
            $extension->baseTemplateRenderMeta(['description' => null])
        );
    }

    public function testAGivenDescriptionComesBeforeThePageTranslation(): void
    {
        $extension = $this->extension($this->app() + [
            BaseTemplateExtension::DEFAULT_PAGE_DESCRIPTION_TRANSLATION_KEY => 'The page file',
        ]);

        $this->assertSame(
            '<meta name="description" content="Given">',
            $extension->baseTemplateRenderMeta(['description' => 'Given'])
        );
    }
}
