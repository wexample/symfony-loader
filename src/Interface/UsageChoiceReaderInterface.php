<?php

namespace Wexample\SymfonyLoader\Interface;

/**
 * Where the usage a visitor chose — a colour scheme, a density — is read back
 * from, for the page to be drawn with it from the first byte. The loader keeps
 * no such choice itself: whatever an application keeps its visitors' choices
 * in answers here (the design system, through symfony-preference).
 */
interface UsageChoiceReaderInterface
{
    /**
     * The usage chosen under that name (`color_scheme`), or null when none was.
     */
    public function chosenUsage(string $usageName): ?string;
}
