<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Command;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Wexample\SymfonyHelpers\Service\BundleService;
use Wexample\SymfonyLoader\Command\SyncTsconfigPathsCommand;
use Wexample\SymfonyLoader\Service\Encore\TsconfigPathsSynchronizer;

class SyncTsconfigPathsCommandTest extends TestCase
{
    public function testExecuteCallsSynchronizerWithDefaults(): void
    {
        $synchronizer = $this->createMock(TsconfigPathsSynchronizer::class);
        $synchronizer
            ->expects($this->once())
            ->method('sync')
            ->with('tsconfig.json', 'assets/encore.manifest.json');

        $command = new SyncTsconfigPathsCommand(
            $this->createStub(BundleService::class),
            $synchronizer
        );

        $tester = new CommandTester($command);
        $status = $tester->execute([]);

        $this->assertSame(Command::SUCCESS, $status);
        $this->assertStringContainsString('tsconfig paths updated', $tester->getDisplay());
    }

    public function testExecuteCallsSynchronizerWithCustomPaths(): void
    {
        $synchronizer = $this->createMock(TsconfigPathsSynchronizer::class);
        $synchronizer
            ->expects($this->once())
            ->method('sync')
            ->with('custom-tsconfig.json', 'custom-manifest.json');

        $command = new SyncTsconfigPathsCommand(
            $this->createStub(BundleService::class),
            $synchronizer
        );

        $tester = new CommandTester($command);
        $status = $tester->execute([
            '--tsconfig' => 'custom-tsconfig.json',
            '--manifest' => 'custom-manifest.json',
        ]);

        $this->assertSame(Command::SUCCESS, $status);
    }
}
