<?php

namespace Wexample\SymfonyLoader\Tests\Traits;

use Wexample\SymfonyTesting\Traits\Parsing\InlineJsonVarExtractorTrait;

trait LoaderTestCaseTrait
{
    use InlineJsonVarExtractorTrait;

    protected function getPageLayoutData(string $content = null): array
    {
        $content = $content ?? $this->content();

        return $this->extractInlineJsonAssignment($content, 'layoutRenderData');
    }
}
