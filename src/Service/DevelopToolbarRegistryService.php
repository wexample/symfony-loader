<?php

namespace Wexample\SymfonyLoader\Service;

use Wexample\SymfonyLoader\Interface\DevelopTabInterface;

class DevelopToolbarRegistryService
{
    /** @var DevelopTabInterface[] */
    private array $tabs = [];

    public function __construct(iterable $tabs = [])
    {
        foreach ($tabs as $tab) {
            $this->tabs[] = $tab;
        }
    }

    public function toArray(): array
    {
        return array_map(fn(DevelopTabInterface $tab) => [
            'id'            => $tab->getId(),
            'label'         => $tab->getLabel(),
            'componentPath' => $tab->getComponentPath(),
        ], $this->tabs);
    }
}
