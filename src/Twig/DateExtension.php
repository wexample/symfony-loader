<?php

namespace Wexample\SymfonyLoader\Twig;

use Twig\TwigFilter;
use Twig\TwigFunction;
use Wexample\PhpDate\Helper\DateHelper;
use Wexample\SymfonyHelpers\Twig\AbstractExtension;
use Wexample\SymfonyLoader\Service\DateService;

class DateExtension extends AbstractExtension
{
    public function __construct(
        private readonly DateService $dateService,
    ) {
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('date_format', [$this, 'dateFormat']),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction(
                'date_display',
                [$this, 'dateDisplay'],
                [self::FUNCTION_OPTION_IS_SAFE => self::FUNCTION_OPTION_IS_SAFE_VALUE_HTML]
            ),
        ];
    }

    /**
     * The text alone, for a title attribute or anywhere markup cannot go.
     */
    public function dateFormat(
        \DateTimeInterface|string|int|null $value,
        string $format = DateHelper::DISPLAY_AUTO,
    ): string {
        return $this->dateService->format($value, $format);
    }

    /**
     * A date the browser can keep up to date.
     *
     * The machine-readable instant travels in the `datetime` attribute and the
     * format name beside it, so the front service can redraw the text without
     * asking the server what it was showing.
     *
     * @param array $options `class` for extra classes, `title` for the format of
     *                       the tooltip, false to drop it
     */
    public function dateDisplay(
        \DateTimeInterface|string|int|null $value,
        string $format = DateHelper::DISPLAY_AUTO,
        array $options = [],
    ): string {
        $date = DateHelper::parse($value);

        if (null === $date) {
            return '';
        }

        $titleFormat = $options['title'] ?? DateHelper::DISPLAY_DATE_TIME_FULL;
        $classes = trim('date '.($options['class'] ?? ''));

        $attributes = [
            'class' => $classes,
            'datetime' => $date->format(\DateTimeInterface::ATOM),
            'data-date-format' => $format,
        ];

        if (false !== $titleFormat) {
            $attributes['title'] = $this->dateService->formatAbsolute($date, $titleFormat);
        }

        $rendered = '';
        foreach ($attributes as $name => $attributeValue) {
            $rendered .= sprintf(' %s="%s"', $name, htmlspecialchars($attributeValue, ENT_QUOTES));
        }

        return sprintf(
            '<time%s>%s</time>',
            $rendered,
            htmlspecialchars($this->dateService->format($date, $format), ENT_QUOTES)
        );
    }
}
