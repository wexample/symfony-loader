<?php

namespace Wexample\SymfonyDesignSystem\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class ColorExtension extends AbstractExtension
{
    private array $colors;

    public function __construct(array $colors)
    {
        $this->colors = $colors;
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('design_system_colors', [$this, 'getColors']),
            new TwigFunction('design_system_color', [$this, 'getColor']),
        ];
    }

    public function getColors(): array
    {
        return $this->colors;
    }

    public function getColor(string $name): ?string
    {
        return $this->colors[$name] ?? null;
    }
}
