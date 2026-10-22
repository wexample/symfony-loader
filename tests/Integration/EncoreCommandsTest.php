<?php

namespace Wexample\SymfonyLoader\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\Filesystem\Filesystem;
use Wexample\SymfonyLoader\Command\GenerateEncoreManifestCommand;
use Wexample\SymfonyLoader\Command\SyncTsconfigPathsCommand;

/**
 * The two commands an application runs before its Encore build: the manifest
 * listing every front the installed bundles declare, and the TypeScript paths
 * that let `import '@front/…'` resolve in the editor as in webpack.
 */
class EncoreCommandsTest extends KernelTestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir().'/symfony-loader-encore-'.uniqid();
        (new Filesystem())->mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        (new Filesystem())->remove($this->dir);
        parent::tearDown();
    }

    public function testTheManifestListsTheFrontsOfTheInstalledBundles(): void
    {
        $tester = $this->runCommand(GenerateEncoreManifestCommand::class, [
            '--output' => $this->dir.'/encore.manifest.json',
            '--no-sync-tsconfig' => true,
        ]);

        $tester->assertCommandIsSuccessful();
        $manifest = $this->readJson('encore.manifest.json');

        $this->assertArrayHasKey('@front', $manifest['aliases']);
        $this->assertStringEndsWith('tests/Fixtures/front/', $manifest['aliases']['@front']);
        $this->assertStringEndsWith('symfony-loader/assets/', $manifest['aliases']['@wexample/symfony-loader']);
        $this->assertFileDoesNotExist($this->dir.'/tsconfig.json');
    }

    public function testTheManifestCommandSyncsTsconfigByDefault(): void
    {
        $this->runCommand(GenerateEncoreManifestCommand::class, [
            '--output' => $this->dir.'/encore.manifest.json',
            '--tsconfig' => $this->dir.'/tsconfig.json',
        ])->assertCommandIsSuccessful();

        $paths = $this->readJson('tsconfig.json')['compilerOptions']['paths'];

        $this->assertArrayHasKey('@front/*', $paths);
    }

    /**
     * The paths are merged into an existing tsconfig, not written over it.
     */
    public function testSyncingKeepsWhatTheTsconfigAlreadyHolds(): void
    {
        $this->runCommand(GenerateEncoreManifestCommand::class, [
            '--output' => $this->dir.'/encore.manifest.json',
            '--no-sync-tsconfig' => true,
        ])->assertCommandIsSuccessful();
        file_put_contents($this->dir.'/tsconfig.json', json_encode([
            'compilerOptions' => [
                'strict' => true,
                'baseUrl' => 'src',
                'paths' => ['@own/*' => ['src/own/*']],
            ],
        ]));

        $this->runCommand(SyncTsconfigPathsCommand::class, [
            '--tsconfig' => $this->dir.'/tsconfig.json',
            '--manifest' => $this->dir.'/encore.manifest.json',
        ])->assertCommandIsSuccessful();

        $options = $this->readJson('tsconfig.json')['compilerOptions'];
        $this->assertTrue($options['strict']);
        $this->assertSame('src', $options['baseUrl']);
        $this->assertSame(['src/own/*'], $options['paths']['@own/*']);
        $this->assertArrayHasKey('@front/*', $options['paths']);
    }

    public function testSyncingWithoutAManifestFails(): void
    {
        $tester = $this->runCommand(SyncTsconfigPathsCommand::class, [
            '--tsconfig' => $this->dir.'/tsconfig.json',
            '--manifest' => $this->dir.'/missing.json',
        ]);

        $this->assertNotSame(Command::SUCCESS, $tester->getStatusCode());
        $this->assertFileDoesNotExist($this->dir.'/tsconfig.json');
    }

    private function runCommand(string $class, array $input): CommandTester
    {
        $tester = new CommandTester(self::getContainer()->get($class));
        $tester->execute($input);

        return $tester;
    }

    private function readJson(string $file): array
    {
        return json_decode((string) file_get_contents($this->dir.'/'.$file), true);
    }
}
