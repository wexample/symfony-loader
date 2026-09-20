<?php

namespace Wexample\SymfonyLoader\Helper;

use Twig\Environment;

/**
 * Where a renderer of a component is found.
 *
 * A component is a name, and under it every way it can be drawn: a stylesheet,
 * a server template, a client twin, a behaviour. They belong together, so they
 * live together — `components/button/button.scss`, `button.html.twig`,
 * `button.vue`, `button.ts` — and the caller names `components/button` without
 * knowing how many of them there are.
 *
 * The older flat form — `components/button.html.twig` beside
 * `components/button.ts` — is still resolved, so a bundle that has not moved
 * yet keeps working. Nothing here writes; it only says which of the two shapes
 * a name is in.
 */
class ComponentPathHelper
{
    /**
     * Turns the name a caller wrote into the view every renderer derives from.
     *
     * `components/button` answers `components/button` when the folder is
     * there, and `components/button` when it is not. Everything downstream —
     * template path, stylesheet, script, translation domain, dom identifier —
     * is built from that one string, so this is the only place that has to know
     * the two shapes exist.
     */
    public static function resolveView(
        Environment $twig,
        string $name,
        string $extension
    ): string {
        $folded = self::fold($name);

        return $twig->getLoader()->exists($folded . $extension) ? $folded : $name;
    }

    /**
     * `components/button` → `components/button`, the name repeated once
     * inside its own directory. A file named after its folder is how a reader
     * tells the renderer of `button` from a neighbour it happens to import.
     */
    public static function fold(string $name): string
    {
        $segments = explode('/', $name);

        return $name . '/' . end($segments);
    }
}
