<?php

namespace Wexample\SymfonyLoader\Twig;

use Exception;
use Symfony\Component\Form\FormView;
use Twig\Environment;
use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\FormService;

class FormExtension extends AbstractExtension
{
    public function __construct(
        private readonly FormService $formService
    )
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'form_load',
                [
                    $this,
                    'formLoad',
                ],
                [
                    self::FUNCTION_OPTION_IS_SAFE => self::FUNCTION_OPTION_IS_SAFE_VALUE_HTML,
                    self::FUNCTION_OPTION_NEEDS_ENVIRONMENT => true,
                ]
            ),
        ];
    }

    /**
     * @throws Exception
     */
    public function formLoad(
        Environment $twig,
        RenderPass $renderPass,
        FormView $formView,
        string $path,
        array $options = []
    ): string
    {
        $component = $this->formService->formLoad(
            $twig,
            $renderPass,
            $formView,
            $path,
            $options
        );

        return $component->getBody() . $component->renderTag();
    }
}
