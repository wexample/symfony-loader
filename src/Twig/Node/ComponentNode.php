<?php

namespace Wexample\SymfonyLoader\Twig\Node;

use Twig\Compiler;
use Twig\Node\Expression\ArrayExpression;
use Twig\Node\Node;
use Wexample\SymfonyLoader\Twig\ComponentsExtension;

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
            ->write('$__componentExt = $this->env->getExtension(')
            ->string(ComponentsExtension::class)
            ->raw(");\n")
            ->write('echo $__componentExt->componentStart(')
            ->raw('$this->env, ')
            ->raw('$context[\'render_pass\'], ')
            ->subcompile($this->getNode('name'))
            ->raw(', ')
            ->subcompile($this->getNode('options'))
            ->raw(");\n")
            ->subcompile($this->getNode('body'))
            ->write('echo $__componentExt->componentEnd(')
            ->raw('$this->env, ')
            ->raw('$context[\'render_pass\'], ')
            ->subcompile($this->getNode('name'))
            ->raw(");\n");
    }
}
