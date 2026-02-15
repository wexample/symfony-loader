<?php

namespace Wexample\SymfonyLoader\Rendering;

use Wexample\SymfonyLoader\Response\AdaptiveResponse;

final class RenderData extends AdaptiveResponse
{
    protected string $responseType = 'render';
    private array $data = [];

    public function __construct(array $data = [])
    {
        $this->data = $data;
    }

    public static function fromArray(array $data): self
    {
        return new self($data);
    }

    public function merge(array $data): self
    {
        $this->data = $data + $this->data;
        return $this;
    }

    public function set(string $key, mixed $value): self
    {
        $this->data[$key] = $value;
        return $this;
    }

    public function toArray(): array
    {
        return parent::toArray() + $this->normalize($this->data);
    }

    private function normalize(mixed $value): mixed
    {
        if ($value instanceof self) {
            return $value->toArray();
        }

        if (is_array($value)) {
            $output = [];
            foreach ($value as $key => $item) {
                $output[$key] = $this->normalize($item);
            }
            return $output;
        }

        return $value;
    }
}
