<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Rendering;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;

class FailStreamWrapper
{
    public mixed $context;

    public function stream_open(string $path, string $mode, int $options, ?string &$opened_path = null): bool
    {
        return false;
    }

    public function url_stat(): array
    {
        return [
            // Regular file mode to make is_file() return true.
            'mode' => 0100000,
        ];
    }
}

class AssetsRegistryTest extends TestCase
{
    public function testLoadManifestErrorsOnInvalidJson(): void
    {
        $tmp = sys_get_temp_dir().'/symfony-loader-registry-'.uniqid();
        mkdir($tmp.'/public/build', 0777, true);

        file_put_contents($tmp.'/public/build/manifest.json', '{invalid json');

        $this->expectException(\RuntimeException::class);
        new AssetsRegistry($tmp);
    }

    public function testLoadManifestReadFailureThrows(): void
    {
        $protocol = 'fail'.uniqid();

        stream_wrapper_register($protocol, FailStreamWrapper::class);

        try {
            $projectDir = $protocol.'://root';
            $this->expectException(\RuntimeException::class);
            set_error_handler(static fn () => true);
            new AssetsRegistry($projectDir);
        } finally {
            restore_error_handler();
            stream_wrapper_unregister($protocol);
        }
    }

    public function testManifestAccessorsAndRealPath(): void
    {
        $tmp = sys_get_temp_dir().'/symfony-loader-registry-'.uniqid();
        mkdir($tmp.'/public/build', 0777, true);

        file_put_contents($tmp.'/public/build/main.js', '//');
        file_put_contents($tmp.'/public/build/manifest.json', json_encode([
            'entry.js' => 'build/main.js',
        ]));

        $registry = new AssetsRegistry($tmp);

        $this->assertTrue($registry->assetExists('entry.js'));
        $this->assertSame('build/main.js', $registry->getBuiltPath('entry.js'));
        $this->assertNotNull($registry->getRealPath('entry.js'));
        $this->assertNull($registry->getRealPath('missing.js'));
        $this->assertSame(['entry.js' => 'build/main.js'], $registry->getManifest());
    }
}

