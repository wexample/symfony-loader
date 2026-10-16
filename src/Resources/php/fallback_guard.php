<?php

// The application's last word when it cannot say anything else: required by
// a front controller before anything else (public/index.php), it answers a
// request PHP is about to drop on a fatal error — a kernel that does not
// boot, a container that does not compile — with the fallback page written
// for a 500 (`loader:dump-fallback-pages`), instead of an empty one.
//
// Only when nothing was sent yet: in development the exception page has been
// drawn already, and stays.
register_shutdown_function(static function (): void {
    $error = error_get_last();

    if (
        null === $error
        || ! in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE, E_USER_ERROR], true)
        || headers_sent()
    ) {
        return;
    }

    $page = dirname($_SERVER['SCRIPT_FILENAME'] ?? '').'/_fallback/500.html';

    if (! is_file($page)) {
        return;
    }

    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    readfile($page);
});
