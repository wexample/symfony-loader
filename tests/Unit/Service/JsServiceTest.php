<?php

namespace Wexample\SymfonyLoader\Tests\Fixtures\Entity;

use Wexample\SymfonyHelpers\Entity\Interfaces\AbstractEntityInterface;

class TestEntity implements AbstractEntityInterface
{
    public function __construct(private ?int $id = null) {}
    public function getId(): ?int { return $this->id; }
    public function setId(int $id) { $this->id = $id; }
}

class NoDtoEntity implements AbstractEntityInterface
{
    public function __construct(private ?int $id = null) {}
    public function getId(): ?int { return $this->id; }
    public function setId(int $id) { $this->id = $id; }
}

namespace App\Api\Dto;

use Wexample\SymfonyHelpers\Api\Dto\EntityDto;

class TestEntity extends EntityDto {}

namespace Wexample\SymfonyLoader\Tests\Unit\Service;

use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBag;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Wexample\SymfonyHelpers\Api\Dto\EntityDto;
use Wexample\SymfonyLoader\Rendering\AssetsRegistry;
use Wexample\SymfonyLoader\Rendering\RenderNode\AbstractRenderNode;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyLoader\Service\JsService;

class JsServiceTest extends TestCase
{
    public function testVarExportSetsSerializedValueOnContextNode(): void
    {
        [$renderPass, $renderNode] = $this->createRenderContext();

        $service = new JsService(
            $this->createStub(NormalizerInterface::class),
            new ParameterBag()
        );

        $service->varExport($renderPass, 'foo', ['bar' => 123]);

        $this->assertSame(['bar' => 123], $renderNode->getVars()['foo'] ?? null);
    }

    public function testVarEnvExportReadsFromParameterBag(): void
    {
        [$renderPass, $renderNode] = $this->createRenderContext();

        $service = new JsService(
            $this->createStub(NormalizerInterface::class),
            new ParameterBag(['my_param' => 'value-from-parameter'])
        );

        $service->varEnvExport($renderPass, 'my_param');

        $this->assertSame('value-from-parameter', $renderNode->getVars()['my_param'] ?? null);
    }

    public function testSerializeEntityNormalizesWhenDtoExists(): void
    {
        $entity = new \Wexample\SymfonyLoader\Tests\Fixtures\Entity\TestEntity(42);

        $normalizer = $this->createMock(NormalizerInterface::class);
        $normalizer
            ->expects($this->once())
            ->method('normalize')
            ->with(
                $entity,
                'jsonld',
                $this->callback(function (array $context): bool {
                    return ($context['displayFormat'] ?? null) === EntityDto::DISPLAY_FORMAT_DEFAULT
                        && ($context['collection_operation_name'] ?? null) === 'twig_serialize_entity';
                })
            )
            ->willReturn(['id' => 42]);

        $service = new JsService($normalizer, new ParameterBag());

        $this->assertSame(['id' => 42], $service->serializeEntity($entity));
    }

    public function testSerializeEntityReturnsNullWhenNoDto(): void
    {
        $entity = new \Wexample\SymfonyLoader\Tests\Fixtures\Entity\NoDtoEntity(7);

        $normalizer = $this->createMock(NormalizerInterface::class);
        $normalizer->expects($this->never())->method('normalize');

        $service = new JsService($normalizer, new ParameterBag());

        $this->assertNull($service->serializeEntity($entity));
    }

    public function testSerializeValueDelegatesToSerializeEntity(): void
    {
        $entity = new \Wexample\SymfonyLoader\Tests\Fixtures\Entity\TestEntity(21);

        $normalizer = $this->createMock(NormalizerInterface::class);
        $normalizer
            ->expects($this->once())
            ->method('normalize')
            ->with(
                $entity,
                'jsonld',
                $this->callback(static fn (array $context): bool =>
                    ($context['displayFormat'] ?? null) === EntityDto::DISPLAY_FORMAT_DEFAULT
                    && ($context['collection_operation_name'] ?? null) === 'twig_serialize_entity'
                )
            )
            ->willReturn(['id' => 21]);

        $service = new JsService($normalizer, new ParameterBag());

        $context = ['displayFormat' => EntityDto::DISPLAY_FORMAT_DEFAULT];

        $this->assertSame(['id' => 21], $service->serializeValue($entity, $context));
    }

    /**
     * @return array{RenderPass, AbstractRenderNode}
     */
    private function createRenderContext(): array
    {
        $renderPass = new RenderPass('bundle/view', new AssetsRegistry(sys_get_temp_dir()));

        $renderNode = new class extends AbstractRenderNode {
            public function getContextType(): string
            {
                return 'page';
            }
        };

        $renderNode->init($renderPass, 'bundle/view');
        $renderPass->setCurrentContextRenderNode($renderNode);

        return [$renderPass, $renderNode];
    }
}

