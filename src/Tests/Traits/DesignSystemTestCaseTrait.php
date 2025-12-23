<?php

namespace Wexample\SymfonyDesignSystem\Tests\Traits;

trait DesignSystemTestCaseTrait
{
    protected function getPageLayoutData(string $content = null): array
    {
        return $this->getRegistryData('layoutRenderData', $content);
    }

    private function getRegistryData(
        string $variableName,
        string $content = null,
    ): array {
        // Ensure we have content to work with, defaulting to $this->content() if null is provided.
        $content = $content ?? $this->content();
        if ($line = $this->getLineMatching($content, $variableName.' = ')) {

            // Capture everything between " = " and the ";" at the end of the line.
            // We use a regular expression match to find the JSON data within the line.
            if (preg_match('/'.$variableName.' = (.*);/', $line, $matches)) {
                // If a match is found, store the captured JSON data.
                $jsonData = $matches[1];

                // Check if we found and captured JSON data.
                if (! empty($jsonData)) {
                    // Decode the JSON data into an associative array and return it.
                    return json_decode($jsonData, true, 512, JSON_OBJECT_AS_ARRAY);
                }
            }
        }

        // Return an empty array if no JSON data was found or captured.
        return [];
    }

    private function getLineMatching(
        string $content,
        string $pattern
    ): ?string {
        // Split the content into lines.
        $lines = explode("\n", $content);

        // Loop through each line of the content.
        foreach ($lines as $line) {
            // Check if the current line contains "layoutRenderData = ".
            if (str_contains($line, $pattern)) {
                return $line;
            }
        }

        return null;
    }
}
