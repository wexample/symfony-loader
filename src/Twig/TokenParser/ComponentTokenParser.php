<?php

namespace Wexample\SymfonyLoader\Twig\TokenParser;

use Twig\Node\Expression\ArrayExpression;
use Twig\Token;
use Twig\TokenParser\AbstractTokenParser;
use Wexample\SymfonyLoader\Twig\Node\ComponentNode;

class ComponentTokenParser extends AbstractTokenParser
{
    public function parse(Token $token): ComponentNode
    {
        $lineno = $token->getLine();
        $stream = $this->parser->getStream();

        $name = $this->parser->getExpressionParser()->parseExpression();
        $options = new ArrayExpression([], $lineno);

        if (! $stream->test(Token::BLOCK_END_TYPE)) {
            $stream->expect(Token::NAME_TYPE, 'with');
            $options = $this->parser->getExpressionParser()->parseExpression();
        }

        $stream->expect(Token::BLOCK_END_TYPE);

        $body = $this->parser->subparse([$this, 'decideComponentEnd'], true);
        $stream->expect(Token::BLOCK_END_TYPE);

        return new ComponentNode($name, $options, $body, $lineno, $this->getTag());
    }

    public function decideComponentEnd(Token $token): bool
    {
        return $token->test('endcomponent');
    }

    public function getTag(): string
    {
        return 'component';
    }
}
