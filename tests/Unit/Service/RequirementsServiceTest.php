<?php

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use Wexample\SymfonyLoader\Class\Requirement;
use Wexample\SymfonyLoader\Exception\RequirementsNotMetException;
use Wexample\SymfonyLoader\Interface\RequirementProviderInterface;
use Wexample\SymfonyLoader\Service\RequirementsService;

/**
 * Every bundle's requirements gathered, the missing ones named all at once.
 */
class RequirementsServiceTest extends TestCase
{
    public function testEveryMissingRequirementIsNamedAtOnce(): void
    {
        $service = new RequirementsService([
            $this->provider(new Requirement('GIVEN', true, 'nothing to do'), new Requirement('FIRST', false, 'set it')),
            $this->provider(new Requirement('SECOND', false, 'set it too')),
        ]);

        $this->assertSame(['FIRST', 'SECOND'], array_map(static fn (Requirement $requirement) => $requirement->name, $service->findMissing()));

        try {
            $service->assertMet();
            $this->fail('Missing requirements are refused.');
        } catch (RequirementsNotMetException $exception) {
            $this->assertStringContainsString('- FIRST: set it', $exception->getMessage());
            $this->assertStringContainsString('- SECOND: set it too', $exception->getMessage());
        }
    }

    public function testNothingMissingPasses(): void
    {
        (new RequirementsService([$this->provider(new Requirement('GIVEN', true, ''))]))->assertMet();

        $this->addToAssertionCount(1);
    }

    public function testAnEnvironmentVariableCountsOnlyWhenSetToSomething(): void
    {
        $_SERVER['LOADER_REQUIREMENT_TEST'] = ' ';
        $this->assertFalse(Requirement::env('LOADER_REQUIREMENT_TEST', '')->met);

        $_SERVER['LOADER_REQUIREMENT_TEST'] = 'value';
        $this->assertTrue(Requirement::env('LOADER_REQUIREMENT_TEST', '')->met);

        unset($_SERVER['LOADER_REQUIREMENT_TEST']);
        $this->assertFalse(Requirement::env('LOADER_REQUIREMENT_TEST', '')->met);
    }

    private function provider(Requirement ...$requirements): RequirementProviderInterface
    {
        return new class($requirements) implements RequirementProviderInterface {
            public function __construct(private readonly array $requirements)
            {
            }

            public function getRequirements(): iterable
            {
                return $this->requirements;
            }
        };
    }
}
