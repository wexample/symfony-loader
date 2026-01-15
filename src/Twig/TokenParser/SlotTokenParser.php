<?php

namespace Wexample\SymfonyLoader\Twig\TokenParser;

use Twig\Token;
use Twig\TokenParser\AbstractTokenParser;
use Wexample\SymfonyLoader\Twig\Node\SlotNode;

class SlotTokenParser extends AbstractTokenParser
{
    public function parse(Token $token): SlotNode
    {
        $lineno = $token->getLine();
        $stream = $this->parser->getStream();

        $name = $this->parser->getExpressionParser()->parseExpression();

        $stream->expect(Token::BLOCK_END_TYPE);

        $body = $this->parser->subparse([$this, 'decideSlotEnd'], true);
        $stream->expect(Token::BLOCK_END_TYPE);

        return new SlotNode($name, $body, $lineno, $this->getTag());
    }

    public function decideSlotEnd(Token $token): bool
    {
        return $token->test('endslot');
    }

    public function getTag(): string
    {
        return 'slot';
    }
}
