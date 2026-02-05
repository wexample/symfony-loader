<?php

namespace Wexample\SymfonyLoader\Twig;

use Twig\TwigFunction;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;

class FormExtension extends AbstractExtension
{
    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'form_load',
                [
                    $this,
                    'formLoad',
                ]
            ),
        ];
    }

    public function formLoad(): string
    {
        return '';
    }
}
