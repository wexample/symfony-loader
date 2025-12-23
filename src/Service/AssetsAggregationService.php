<?php

namespace Wexample\SymfonyDesignSystem\Service;

use Symfony\Component\HttpKernel\KernelInterface;
use Wexample\SymfonyDesignSystem\Rendering\AssetTag;
use Wexample\SymfonyHelpers\Helper\ArrayHelper;
use Wexample\SymfonyHelpers\Helper\FileHelper;

class AssetsAggregationService
{
    public const DIR_BUILD = 'build/';

    public const DIR_PUBLIC = 'public/';

    private string $pathProject;

    private string $pathPublic;

    public function __construct(
        KernelInterface $kernel,
    ) {
        $this->pathProject = $kernel->getProjectDir().'/';
        $this->pathPublic = $this->pathProject.self::DIR_PUBLIC;
    }

    public function buildAggregatedTags(
        string $view,
        array $baseTags,
    ): array {
        $aggregated = [];


        foreach ($baseTags as $type => $contexts) {
            /** @var ?AssetTag $aggregationTag */
            $aggregationTag = null;
            $aggregationContent = '';
            $counter = 0;

            foreach ($contexts as $contextTags) {
                /** @var AssetTag $tag */
                foreach ($contextTags as $usage => $tags) {
                    foreach ($tags as $tag) {
                        // Ignore placeholders.
                        if ($tag->getPath()) {
                            if ($tag->canAggregate()) {
                                if (! $aggregationTag) {
                                    $aggregationTag = new AssetTag();

                                    $aggregationTag->setId(
                                        $view.'-'.$counter
                                    );

                                    $aggregationTag->setMedia(
                                        $tag->getMedia()
                                    );

                                    $aggregationTag->setContext(
                                        $tag->getContext()
                                    );

                                    $aggregationTag->setPath(
                                        $this->buildAggregatedPathFromView(
                                            $view,
                                            $type,
                                            $counter,
                                        )
                                    );

                                    $counter++;
                                }

                                $tagPath = $tag->getPath();
                                $aggregationContent .= PHP_EOL.'/* AGGREGATED : '.$tagPath.' */ '.PHP_EOL
                                    .file_get_contents($this->pathPublic.$tagPath);
                            } else {
                                $this->writeAggregationTag(
                                    $usage,
                                    $type,
                                    $aggregationTag,
                                    $aggregationContent,
                                    $aggregated
                                );

                                $aggregationTag = null;
                                $aggregationContent = '';

                                $aggregated[$type][$tag->getContext()][$usage][] = $tag;
                            }
                        } else {
                            $aggregated[$type][$tag->getContext()][$usage][] = $tag;
                        }
                    }
                }
            }

            $this->writeAggregationTag(
                'extra',
                $type,
                $aggregationTag,
                $aggregationContent,
                $aggregated
            );
        }

        return $aggregated;
    }

    private function writeAggregationTag(
        string $usage,
        string $type,
        ?AssetTag $tag,
        string $body,
        &$aggregated
    ): void {
        // Null tag says that no file has been read.
        if (is_null($tag)) {
            return;
        }

        $hash = FileHelper::fileWriteAndHash(
            $this->pathPublic.$tag->getPath(),
            $body
        );

        $tag->setPath(
            $tag->getPath().'?'.$hash
        );

        // Try to keep an order.
        $aggregated = ArrayHelper::insertNewAfterKey(
            $aggregated,
            $usage,
            $usage.'-agg',
            []
        );

        $aggregated[$type][$tag->getContext()][$usage.'-agg'][] = $tag;
    }

    protected function buildAggregatedPathFromView(
        string $templateName,
        string $type,
        int $counter
    ): string {
        return self::DIR_BUILD.implode(
            '/'.$type.'/',
            explode(
                '::',
                $templateName
            )
        ).'-'.$counter.'.'.FileHelper::SUFFIX_AGGREGATED.'.'.$type;
    }
}
