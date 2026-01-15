<?php

namespace Wexample\SymfonyLoader\Twig\Node;

use Twig\Compiler;
use Twig\Node\Expression\ArrayExpression;
use Twig\Node\Node;
use Wexample\SymfonyLoader\Twig\Runtime\ComponentSlotsRuntime;

class ComponentNode extends Node
{
    public function __construct(
        Node $name,
        ?Node $options,
        Node $body,
        int $lineno,
        string $tag = null
    ) {
        $nodes = [
            'name' => $name,
            'options' => $options ?? new ArrayExpression([], $lineno),
            'body' => $body,
        ];

        parent::__construct($nodes, [], $lineno, $tag);
    }

    public function compile(Compiler $compiler): void
    {
        $compiler
            ->addDebugInfo($this)
            ->write('$__componentRuntime = $this->env->getRuntime(')
            ->string(ComponentSlotsRuntime::class)
            ->raw(");\n")
            ->write('echo $__componentRuntime->componentStart(')
            ->raw('$this->env, ')
            ->raw('$context[\'render_pass\'], ')
            ->subcompile($this->getNode('name'))
            ->raw(', ')
            ->subcompile($this->getNode('options'))
            ->raw(");\n")
            ->subcompile($this->getNode('body'))
            ->write('echo $__componentRuntime->componentEnd(')
            ->raw('$this->env, ')
            ->raw('$context[\'render_pass\'], ')
            ->subcompile($this->getNode('name'))
            ->raw(");\n");
    }
}
