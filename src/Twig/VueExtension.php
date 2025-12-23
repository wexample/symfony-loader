<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Exception;
use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use Twig\TwigFilter;
use Twig\TwigFunction;
use Wexample\SymfonyDesignSystem\Rendering\RenderPass;
use Wexample\SymfonyDesignSystem\Service\VueService;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class VueExtension extends AbstractExtension
{
    final public const TEMPLATE_FILE_EXTENSION = '.vue.twig';

    public function __construct(
        private readonly VueService $vueService
    ) {
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter(
                'vue_key',
                [
                    $this,
                    'vueKey',
                ]
            ),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'vue',
                [
                    $this,
                    'vue',
                ],
                [
                    self::FUNCTION_OPTION_NEEDS_ENVIRONMENT => true,
                    self::FUNCTION_OPTION_IS_SAFE => [self::FUNCTION_OPTION_HTML],
                ]
            ),
            new TwigFunction(
                'vue_include',
                [
                    $this,
                    'vueInclude',
                ],
                [
                    self::FUNCTION_OPTION_NEEDS_ENVIRONMENT => true,
                    self::FUNCTION_OPTION_IS_SAFE => [self::FUNCTION_OPTION_HTML],
                ]
            ),
            new TwigFunction(
                'vue_require',
                [
                    $this,
                    'vueRequire',
                ],
                [
                    self::FUNCTION_OPTION_NEEDS_ENVIRONMENT => true,
                    self::FUNCTION_OPTION_IS_SAFE => [self::FUNCTION_OPTION_HTML],
                ]
            ),
            new TwigFunction(
                'vue_render_templates',
                [
                    $this,
                    'vueRenderTemplates',
                ]
            ),
        ];
    }

    /**
     * @throws Exception
     */
    public function vue(
        Environment $env,
        RenderPass $renderPass,
        string $path,
        ?array $props = [],
        string $tagName = VueService::TAG_TEMPLATE,
        ?array $twigContext = []
    ): string {
        return $this->vueService->vueRender(
            twig: $env,
            renderPass: $renderPass,
            view: $path,
            props: $props,
            twigContext: $twigContext,
            tagName: $tagName
        );
    }

    public function vueRenderTemplates(): string
    {
        // Add vue js templates.
        return implode('', $this->vueService->renderedTemplates);
    }

    /**
     * @throws LoaderError
     * @throws RuntimeError
     * @throws SyntaxError|Exception
     */
    public function vueRequire(
        Environment $env,
        RenderPass $renderPass,
        string $path,
        ?array $props = [],
        string $tagName = VueService::TAG_TEMPLATE,
    ): void {
        // Same behavior but no output tag.
        $this->vueInclude(
            $env,
            $renderPass,
            $path,
            $props,
            tagName: $tagName
        );
    }

    /**
     * @throws Exception
     */
    public function vueInclude(
        Environment $env,
        RenderPass $renderPass,
        string $path,
        ?array $props = [],
        string $tagName = VueService::TAG_TEMPLATE,
        ?array $twigContext = [],
    ): string {
        return $this->vueService->vueRender(
            $env,
            $renderPass,
            $path,
            $props,
            $twigContext,
            $tagName
        );
    }

    public function vueKey(
        string $key,
        string $filters = null
    ): string {
        return '{{ ' . $key . ($filters ? ' | ' . $filters : '') . ' }}';
    }
}
