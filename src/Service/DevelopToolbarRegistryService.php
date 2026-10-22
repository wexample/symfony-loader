<?php

namespace Wexample\SymfonyLoader\Service;

use Wexample\SymfonyLoader\Interface\DevelopTabInterface;

class DevelopToolbarRegistryService
{
    /** @var DevelopTabInterface[] */
    private readonly array $tabs;

    public function __construct(iterable $tabs = [])
    {
        $registered = [];
        foreach ($tabs as $tab) {
            $registered[] = $tab;
        }

        $this->tabs = $registered;
    }

    public function toArray(): array
    {
        return array_map(fn (DevelopTabInterface $tab) => [
            'id' => $tab->getId(),
            'label' => $tab->getLabel(),
            'componentPath' => $tab->getComponentPath(),
        ], $this->tabs);
    }
}
