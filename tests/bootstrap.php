<?php

$vendorAutoload = __DIR__.'/../vendor/autoload.php';

if (! file_exists($vendorAutoload)) {
    throw new RuntimeException('Composer autoload not found. Run "composer install" first.');
}

require $vendorAutoload;

spl_autoload_register(
    static function (string $class): void {
        $prefix = 'Wexample\\SymfonyLoader\\Tests\\';
        $baseDir = __DIR__.'/';
        $prefixLength = strlen($prefix);

        if (strncmp($prefix, $class, $prefixLength) !== 0) {
            return;
        }

        $relativeClass = substr($class, $prefixLength);
        $file = $baseDir.str_replace('\\', '/', $relativeClass).'.php';

        if (is_file($file)) {
            require $file;
        }
    }
);
