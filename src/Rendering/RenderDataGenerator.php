<?php

namespace Wexample\SymfonyLoader\Rendering;

use function is_a;
use function is_object;

use Wexample\Helpers\Helper\ClassHelper;
use Wexample\SymfonyHelpers\Attribute\WorkerSafe;

abstract class RenderDataGenerator
{
    /**
     * Whether each field of each class is private, keyed "class::field":
     * every asset and node of every render is serialized, and the answer only
     * depends on the class declaring the field.
     *
     * @var array<string, bool>
     */
    #[WorkerSafe('Read from the class declarations, fixed for the process.')]
    private static array $privateFields = [];

    public function arrayToRenderData(array $array): array
    {
        $output = [];

        /** @var RenderDataGenerator $renderDataGenerator */
        foreach ($array as $key => $renderDataGenerator) {
            $output[$key] = $renderDataGenerator->toRenderData();
        }

        return $output;
    }

    abstract public function toRenderData(): RenderData;

    public function serializeVariables(array $variables): array
    {
        $output = [];

        foreach ($variables as $variable) {
            $isPrivate = self::$privateFields[static::class.'::'.$variable]
                ??= (new \ReflectionProperty($this, $variable))->isPrivate();

            if ($isPrivate) {
                // Try to use $this->getVariable().
                $value = ClassHelper::getFieldGetterValue($this, $variable);
            } else {
                $value = $this->$variable;
            }

            if (! is_object($value)) {
                $output[$variable] = $value;
            } elseif (is_a($value, RenderDataGenerator::class)) {
                $output[$variable] = $value->toRenderData();
            }
        }

        return $output;
    }
}
