<?php

namespace Wexample\SymfonyLoader\Service;

use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Wexample\SymfonyHelpers\Helper\FileHelper;
use Wexample\SymfonyLoader\Helper\AdaptiveRequestHelper;
use Wexample\SymfonyLoader\Rendering\RenderPass;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

class AdaptiveResponseService
{
    private const array ALLOWED_BASES = [
        RenderPass::BASE_MODAL,
        RenderPass::BASE_PANEL,
        RenderPass::BASE_DOCK,
        RenderPass::BASE_OVERLAY,
        RenderPass::BASE_EMBED,
        RenderPass::BASE_PAGE,
        RenderPass::BASE_DEFAULT,
    ];

    private const string QUERY_STRING_CONFIG_KEY_FORMAT = '__format';
    private const string QUERY_STRING_CONFIG_KEY_LAYOUT = '__layout';

    /**
     * The uri the page answers to on its own: the current one, minus the query
     * keys that say nothing about the page and only tell it which shell to
     * render into. This is what an embedded page links to when it offers to be
     * opened whole.
     */
    public function getStandaloneUri(Request $request): string
    {
        $query = $request->query->all();
        unset(
            $query[self::QUERY_STRING_CONFIG_KEY_FORMAT],
            $query[self::QUERY_STRING_CONFIG_KEY_LAYOUT],
        );

        return $request->getSchemeAndHttpHost()
            . $request->getBaseUrl()
            . $request->getPathInfo()
            . ($query ? '?' . http_build_query($query) : '');
    }

    /**
     * A page held somewhere — a panel, an embed — that redirects stays where it
     * is held: the shell it was asked in (`__format`, `__layout`) goes along to
     * the page it sends to. Followed by the browser without them, the next page
     * would be rendered into the default shell, a modal's, inside the panel.
     * A redirect leaving the site, or already naming its shell, is left alone.
     */
    public function keepShellOnRedirect(Request $request, Response $response): void
    {
        if (! $response instanceof RedirectResponse) {
            return;
        }

        $shell = array_intersect_key($request->query->all(), [
            self::QUERY_STRING_CONFIG_KEY_FORMAT => true,
            self::QUERY_STRING_CONFIG_KEY_LAYOUT => true,
        ]);

        $target = $response->getTargetUrl();
        $host = parse_url($target, PHP_URL_HOST);

        if (! $shell || ($host && $host !== $request->getHost())) {
            return;
        }

        parse_str((string) parse_url($target, PHP_URL_QUERY), $query);
        $missing = array_diff_key($shell, $query);

        if (! $missing) {
            return;
        }

        [$base, $fragment] = array_pad(explode('#', $target, 2), 2, null);

        $response->setTargetUrl(
            $base
            . (str_contains($base, '?') ? '&' : '?')
            . http_build_query($missing)
            . (null !== $fragment ? '#' . $fragment : '')
        );
    }

    public function getLayoutBasePath(RenderPass $renderPass): string
    {
        return RenderPass::BASES_MAIN_DIR
            . $renderPass->getOutputType()
            . FileHelper::FOLDER_SEPARATOR
            . $renderPass->getLayoutBase()
            . TemplateHelper::TEMPLATE_FILE_EXTENSION;
    }

    public function initializeRequestAttributes(Request $request): void
    {
        if (! $request->attributes->has(AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE)) {
            $request->attributes->set(
                AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE,
                $this->detectOutputTypeFromRequest($request)
            );
        }

        if (! $request->attributes->has(AdaptiveRequestHelper::REQUEST_ATTR_LAYOUT_BASE)) {
            $outputType = $request->attributes->get(AdaptiveRequestHelper::REQUEST_ATTR_OUTPUT_TYPE);
            $outputType = is_string($outputType) ? $outputType : RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
            $request->attributes->set(
                AdaptiveRequestHelper::REQUEST_ATTR_LAYOUT_BASE,
                $this->detectLayoutBaseFromRequest($request, $outputType)
            );
        }
    }

    private function detectOutputTypeFromRequest(Request $request): string
    {
        if ($forcedFormat = $request->query->get(self::QUERY_STRING_CONFIG_KEY_FORMAT)) {
            if (in_array($forcedFormat, RenderPass::OUTPUT_TYPES, true)) {
                return $forcedFormat;
            }
        }

        return $request->isXmlHttpRequest()
            ? RenderPass::OUTPUT_TYPE_RESPONSE_JSON
            : RenderPass::OUTPUT_TYPE_RESPONSE_HTML;
    }

    private function detectLayoutBaseFromRequest(Request $request, string $outputType): string
    {
        if ($outputType === RenderPass::OUTPUT_TYPE_RESPONSE_JSON) {
            $base = $request->query->get(
                self::QUERY_STRING_CONFIG_KEY_LAYOUT,
                RenderPass::BASE_MODAL
            );

            return in_array($base, self::ALLOWED_BASES, true)
                ? $base
                : RenderPass::BASE_MODAL;
        }

        return RenderPass::BASE_DEFAULT;
    }
}
