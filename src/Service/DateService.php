<?php

namespace Wexample\SymfonyLoader\Service;

use DateTimeImmutable;
use DateTimeInterface;
use Wexample\PhpDate\Class\DateFormatter;
use Wexample\PhpDate\Helper\DateHelper;
use Wexample\SymfonyTranslations\Translation\Translator;

/**
 * What plugs the framework-agnostic formatter into the application.
 *
 * The rules of display live in `wexample/php-date`; this says where the wording
 * comes from and which locale is current, so a date printed by Twig reads like the
 * rest of the page.
 */
class DateService
{
    final public const string TRANSLATION_DOMAIN = 'WexampleSymfonyLoaderBundle.common.system';

    private readonly DateFormatter $formatter;

    public function __construct(
        private readonly Translator $translator,
        private readonly ?string $dateLocale = null,
    ) {
        $this->formatter = new DateFormatter(
            fn (string $key, array $parameters, ?string $locale): string => $this->translator->trans(
                self::TRANSLATION_DOMAIN.Translator::DOMAIN_SEPARATOR.$key,
                $parameters,
                null,
                $locale
            ),
            fn (): string => $this->getLocale(),
        );
    }

    /**
     * The configured date locale if any, the translation locale otherwise.
     */
    public function getLocale(): string
    {
        return $this->dateLocale ?? $this->translator->getLocale();
    }

    /**
     * @param string $format One of the `DateHelper::DISPLAY_*` names, or a raw ICU
     *                       pattern for a shape the named formats do not cover
     */
    public function format(
        DateTimeInterface|string|int|null $value,
        string $format = DateHelper::DISPLAY_AUTO,
        ?string $locale = null,
        ?DateTimeInterface $now = null,
    ): string {
        return $this->formatter->format($value, $format, $locale, $now);
    }

    public function formatAbsolute(
        DateTimeImmutable $date,
        string $format,
        ?string $locale = null,
    ): string {
        return $this->formatter->formatAbsolute($date, $format, $locale);
    }

    public function formatRelative(
        DateTimeImmutable $date,
        ?DateTimeInterface $now = null,
        ?string $locale = null,
    ): string {
        return $this->formatter->formatRelative($date, $now, $locale);
    }
}
