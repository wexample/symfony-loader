<?php

namespace Wexample\SymfonyLoader\Interface;

interface DevelopTabInterface
{
    public function getId(): string;

    public function getLabel(): string;

    public function getComponentPath(): string;
}
