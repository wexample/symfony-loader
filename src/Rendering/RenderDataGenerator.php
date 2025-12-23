<?php

namespace Wexample\SymfonyDesignSystem\Rendering;

use function is_a;
use function is_object;

use Wexample\Helpers\Helper\ClassHelper;

abstract class RenderDataGenerator
{
    public function arrayToRenderData(array $array): array
    {
        $output = [];

        /** @var RenderDataGenerator $renderDataGenerator */
        foreach ($array as $key => $renderDataGenerator) {
            $output[$key] = $renderDataGenerator->toRenderData();
        }

        return $output;
    }

    abstract public function toRenderData(): array;

    public function serializeVariables(array $variables): array
    {
        $output = [];

        foreach ($variables as $variable) {
            if (isset($this->$variable)) {
                $reflect = new \ReflectionProperty($this, $variable);
                if ($reflect->isPrivate()) {
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
        }

        return $output;
    }
}
