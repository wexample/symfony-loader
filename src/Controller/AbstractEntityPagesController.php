<?php

namespace Wexample\SymfonyLoader\Controller;

use Wexample\SymfonyHelpers\Controller\Traits\EntityControllerTrait;

abstract class AbstractEntityPagesController extends AbstractPagesController
{
    use EntityControllerTrait;
}
