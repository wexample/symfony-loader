<?php

namespace Wexample\SymfonyLoader\Twig\Node;

use Twig\Compiler;
use Twig\Node\Node;
use Wexample\SymfonyLoader\Twig\ComponentsExtension;

class SlotNode extends Node
{
    public function __construct(
        Node $name,
        Node $body,
        int $lineno,
        string $tag = null
    ) {
        parent::__construct(
            [
                'name' => $name,
                'body' => $body,
            ],
            [],
            $lineno,
            $tag
        );
    }

    public function compile(Compiler $compiler): void
    {
        $compiler
            ->addDebugInfo($this)
            ->write('$__componentExt = $this->env->getExtension(')
            ->string(ComponentsExtension::class)
            ->raw(");\n")
            ->write('echo $__componentExt->componentSlotStart(')
            ->raw('$this->env, ')
            ->raw('$context[\'render_pass\'], ')
            ->subcompile($this->getNode('name'))
            ->raw(");\n")
            ->subcompile($this->getNode('body'))
            ->write('echo $__componentExt->componentSlotEnd(')
            ->raw('$this->env, ')
            ->raw('$context[\'render_pass\'], ')
            ->subcompile($this->getNode('name'))
            ->raw(");\n");
    }
}
