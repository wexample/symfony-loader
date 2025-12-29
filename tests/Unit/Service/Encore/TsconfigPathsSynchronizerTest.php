<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service\Encore;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyLoader\Service\Encore\TsconfigPathsSynchronizer;

class TsconfigPathsSynchronizerTest extends TestCase
{
    private string $tmpDir;
    private Filesystem $fs;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fs = new Filesystem();
        $this->tmpDir = sys_get_temp_dir().'/symfony-loader-tsconfig-'.uniqid();
        $this->fs->mkdir($this->tmpDir);
    }

    protected function tearDown(): void
    {
        $this->fs->remove($this->tmpDir);
        parent::tearDown();
    }

    public function testSyncWritesAliasesAndDefaultBaseUrl(): void
    {
        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($this->tmpDir);

        $this->fs->mkdir($this->tmpDir.'/assets');
        file_put_contents($this->tmpDir.'/assets/encore.manifest.json', json_encode([
            'aliases' => [
                'foo' => './front/',
                'bar/*' => './other/*',
            ],
        ]));
        file_put_contents($this->tmpDir.'/tsconfig.json', json_encode([]));

        $service = new TsconfigPathsSynchronizer($kernel);
        $service->sync();

        $tsconfig = json_decode(file_get_contents($this->tmpDir.'/tsconfig.json'), true);

        $this->assertSame('.', $tsconfig['compilerOptions']['baseUrl']);
        $this->assertSame(['./other/*'], $tsconfig['compilerOptions']['paths']['bar/*']);
        $this->assertSame(['./front/*'], $tsconfig['compilerOptions']['paths']['foo/*']);
        $this->assertSame(['bar/*', 'foo/*'], array_keys($tsconfig['compilerOptions']['paths']));
    }

    public function testSyncThrowsWhenManifestMissingAliases(): void
    {
        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($this->tmpDir);

        $this->fs->mkdir($this->tmpDir.'/assets');
        file_put_contents($this->tmpDir.'/assets/encore.manifest.json', json_encode([]));

        $service = new TsconfigPathsSynchronizer($kernel);

        $this->expectException(\RuntimeException::class);
        $service->sync();
    }

    public function testSyncWithAbsolutePathsKeepsExistingBaseUrl(): void
    {
        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($this->tmpDir);

        $manifest = $this->tmpDir.'/custom.manifest.json';
        $tsconfig = $this->tmpDir.'/custom.tsconfig.json';

        file_put_contents($manifest, json_encode([
            'aliases' => [
                'abs' => './abs',
            ],
        ]));

        file_put_contents($tsconfig, json_encode([
            'compilerOptions' => [
                'baseUrl' => '/keep',
            ],
        ]));

        $service = new TsconfigPathsSynchronizer($kernel);
        $service->sync($tsconfig, $manifest);

        $updated = json_decode(file_get_contents($tsconfig), true);

        $this->assertSame('/keep', $updated['compilerOptions']['baseUrl']);
        $this->assertSame(['./abs/*'], $updated['compilerOptions']['paths']['abs/*']);
    }
}

