<?php

namespace Wexample\SymfonyLoader\Service;

use Wexample\SymfonyTemplate\Helper\TemplateHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class AdaptiveResponseService
{
    public function getLayoutBasePath(RenderPass $renderPass): string
    {
        return RenderPass::BASES_MAIN_DIR
            . $renderPass->getOutputType()
            . FileHelper::FOLDER_SEPARATOR
            . $renderPass->getLayoutBase()
            . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }
}
