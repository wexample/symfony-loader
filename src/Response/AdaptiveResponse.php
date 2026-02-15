<?php

namespace Wexample\SymfonyLoader\Response;

abstract class AdaptiveResponse
{
    protected bool $ok = true;
    protected string $responseType = 'adaptive';

    public function isOk(): bool
    {
        return $this->ok;
    }

    public function getResponseType(): string
    {
        return $this->responseType;
    }

    public function setOk(bool $ok): self
    {
        $this->ok = $ok;
        return $this;
    }

    public function toArray(): array
    {
        return [
            'ok' => $this->ok,
            'response_type' => $this->responseType,
        ];
    }
}
