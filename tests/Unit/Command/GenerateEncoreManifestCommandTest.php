<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Command;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyHelpers\Service\BundleService;
use Wexample\SymfonyLoader\Command\GenerateEncoreManifestCommand;
use Wexample\SymfonyLoader\Service\Encore\EncoreManifestBuilder;
use Wexample\SymfonyLoader\Service\Encore\TsconfigPathsSynchronizer;

class GenerateEncoreManifestCommandTest extends TestCase
{
    private string $tmpDir;
    private Filesystem $filesystem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmpDir = sys_get_temp_dir().'/symfony-loader-encore-manifest-'.uniqid();
        $this->filesystem = new Filesystem();
        $this->filesystem->mkdir($this->tmpDir);
    }

    protected function tearDown(): void
    {
        $this->filesystem->remove($this->tmpDir);

        parent::tearDown();
    }

    public function testExecuteWritesManifestAndSyncsTsconfig(): void
    {
        $manifest = [
            'frontCount' => 1,
            'fronts' => ['foo'],
            'version' => '1.2.3',
        ];

        $builder = $this->createMock(EncoreManifestBuilder::class);
        $builder->expects($this->once())->method('build')->willReturn($manifest);

        $tsconfig = $this->createMock(TsconfigPathsSynchronizer::class);
        $tsconfig->expects($this->once())
            ->method('sync')
            ->with(
                'tsconfig.json',
                $this->stringContains('assets/encore.manifest.json')
            );

        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($this->tmpDir);

        $command = new GenerateEncoreManifestCommand(
            $this->createStub(BundleService::class),
            $builder,
            $tsconfig,
            $kernel,
            $this->filesystem
        );

        $tester = new CommandTester($command);
        $tester->execute([]);

        $manifestPath = $this->tmpDir.'/assets/encore.manifest.json';
        $this->assertFileExists($manifestPath);
        $this->assertSame($manifest, json_decode(file_get_contents($manifestPath), true));
    }

    public function testExecuteWithCustomOutputAndNoSync(): void
    {
        $manifest = ['fronts' => [], 'version' => 'x'];
        $customPath = $this->tmpDir.'/custom/manifest.json';

        $builder = $this->createStub(EncoreManifestBuilder::class);
        $builder->method('build')->willReturn($manifest);

        $tsconfig = $this->createMock(TsconfigPathsSynchronizer::class);
        $tsconfig->expects($this->never())->method('sync');

        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($this->tmpDir);

        $command = new GenerateEncoreManifestCommand(
            $this->createStub(BundleService::class),
            $builder,
            $tsconfig,
            $kernel,
            $this->filesystem
        );

        $tester = new CommandTester($command);
        $tester->execute([
            '--output' => $customPath,
            '--sync-tsconfig' => false,
            '--pretty' => false,
        ]);

        $this->assertFileExists($customPath);
        $this->assertSame($manifest, json_decode(file_get_contents($customPath), true));
    }

    public function testExecuteFailsWhenJsonWriteFails(): void
    {
        $manifest = ['fronts' => [NAN]];
        $outputPath = $this->tmpDir.'/assets/manifest.json';

        $builder = $this->createStub(EncoreManifestBuilder::class);
        $builder->method('build')->willReturn($manifest);

        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($this->tmpDir);

        $command = new GenerateEncoreManifestCommand(
            $this->createStub(BundleService::class),
            $builder,
            $this->createStub(TsconfigPathsSynchronizer::class),
            $kernel,
            $this->filesystem
        );

        $tester = new CommandTester($command);
        $status = $tester->execute(['--output' => $outputPath]);

        $this->assertSame(Command::FAILURE, $status);
        $this->assertFileDoesNotExist($outputPath);
    }

    public function testExecuteWithAbsolutePathOutsideProjectDisplaysAbsolute(): void
    {
        $projectDir = $this->tmpDir.'/projectA';
        $outsideDir = $this->tmpDir.'/projectB';
        $this->filesystem->mkdir([$projectDir, $outsideDir]);

        $manifest = ['fronts' => [], 'version' => 'x'];
        $outputPath = $outsideDir.'/custom-manifest.json';

        $builder = $this->createStub(EncoreManifestBuilder::class);
        $builder->method('build')->willReturn($manifest);

        $tsconfig = $this->createMock(TsconfigPathsSynchronizer::class);
        $tsconfig->expects($this->never())->method('sync');

        $kernel = $this->createStub(KernelInterface::class);
        $kernel->method('getProjectDir')->willReturn($projectDir);

        $command = new GenerateEncoreManifestCommand(
            $this->createStub(BundleService::class),
            $builder,
            $tsconfig,
            $kernel,
            $this->filesystem
        );

        $tester = new CommandTester($command);
        $tester->execute([
            '--output' => $outputPath,
            '--sync-tsconfig' => false,
        ]);

        $this->assertFileExists($outputPath);
        $this->assertStringContainsString(
            preg_replace('/\\s+/', '', $outputPath),
            preg_replace('/\\s+/', '', $tester->getDisplay())
        );
    }
}
