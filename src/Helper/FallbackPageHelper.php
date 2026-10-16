<?php

namespace Wexample\SymfonyLoader\Helper;

/**
 * The pages an application shows when it cannot draw its own
 * (system/fallback.html.twig): starting, its interface being built, an error
 * it could not render. Said once here, for Symfony to render them live and for
 * `loader:dump-fallback-pages` to write them out for whatever serves the
 * application when Symfony cannot.
 */
class FallbackPageHelper
{
    final public const string TEMPLATE = '@WexampleSymfonyLoaderBundle/system/fallback.html.twig';

    /** Where the pages are written, under the public directory. */
    final public const string PUBLIC_DIR = '_fallback';

    final public const string PAGE_STARTUP = 'startup';

    final public const string PAGE_ASSETS = 'assets';

    /** What the starting application says of its progress (see the board's entrypoint). */
    final public const string STARTUP_STATUS_URL = '/_startup.json';

    /** What a running build says of its progress, beside what it builds (see encore.manifest.js). */
    final public const string BUILD_STATUS_URL = '/build/build-progress.json';

    /**
     * Sent with the pages that only stand in for a moment — starting, building —,
     * so a page waiting for the application knows it is not there yet. Never
     * with an error page: that one is the application's answer, and is shown.
     */
    final public const string HEADER = 'X-Fallback-Page';

    /** The statuses an error page is written for. */
    final public const array ERROR_CODES = [400, 403, 404, 500, 503];

    private const array ERRORS = [
        400 => ['Bad request', 'The request could not be understood.'],
        403 => ['Access denied', 'This page is not open to you.'],
        404 => ['Page not found', 'Nothing answers at this address.'],
        500 => ['Something went wrong', 'The application could not answer. Try again in a moment.'],
        503 => ['Unavailable for a moment', 'The application is not ready to answer. Try again in a moment.'],
    ];

    /**
     * The application getting ready: followed step by step, and opened once
     * ready.
     *
     * @return array<string, mixed>
     */
    public static function startup(): array
    {
        return [
            'title' => 'Starting up',
            'message' => 'The application is getting ready. This page follows its progress and opens it as soon as it is.',
            'poll' => self::STARTUP_STATUS_URL,
            'poll_gone' => 'site',
        ];
    }

    /**
     * The application up, its interface not built: followed while a build
     * runs, and reloaded once it is over.
     *
     * @return array<string, mixed>
     */
    public static function assets(?string $hint = null): array
    {
        return [
            'title' => 'Building the interface',
            'message' => 'The interface of the application is not built yet. This page opens it as soon as it is.',
            'hint' => $hint,
            'poll' => self::BUILD_STATUS_URL,
            'poll_gone' => 'wait',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function error(int $statusCode): array
    {
        [$title, $message] = self::ERRORS[$statusCode]
            ?? ($statusCode >= 500 ? self::ERRORS[500] : self::ERRORS[400]);

        return [
            'status_code' => $statusCode,
            'title' => $title,
            'message' => $message,
        ];
    }

    /**
     * Every page written out, by its file name under PUBLIC_DIR.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function pages(): array
    {
        $pages = [
            self::PAGE_STARTUP.'.html' => self::startup(),
            self::PAGE_ASSETS.'.html' => self::assets(),
        ];

        foreach (self::ERROR_CODES as $code) {
            $pages[$code.'.html'] = self::error($code);
        }

        return $pages;
    }
}
