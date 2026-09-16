<?php

namespace Wexample\SymfonyLoader\Controller\Pages;

use Wexample\SymfonyLoader\Controller\AbstractPagesController;

abstract class AbstractDesignSystemController extends AbstractPagesController
{
    /** Where the design system's pages are read. */
    final public const CONTROLLER_BASE_ROUTE = 'design-system';

    /**
     * Where what belongs to the design system without being a page is served —
     * fixtures, endpoints. The underscore is the whole signal: a path opening
     * on one is not addressed to a human.
     */
    final public const CONTROLLER_BASE_ROUTE_INTERNAL = '_design-system';
}
