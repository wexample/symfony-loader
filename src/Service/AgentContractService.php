<?php

namespace Wexample\SymfonyLoader\Service;

use stdClass;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Yaml\Yaml;
use Twig\Environment;
use Wexample\SymfonyHelpers\Attribute\WorkerSafe;
use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;
use Wexample\SymfonyLoader\Twig\VueExtension;
use Wexample\SymfonyTemplate\Helper\TemplateHelper;

/**
 * What an agent is told about a component, read from the `.ai.yml` beside its
 * template: the kind of piece it is, what it is for, and the actions it offers,
 * each with the schema of its arguments. The script beside it runs the actions;
 * this file says which there are, so that they can be read without a page — by
 * the inventory, the server, another language.
 *
 * A contract may extend another component's (`extends`): a switch for the
 * colour scheme is a switch, and only says what it is for.
 *
 * Written in english and never translated: a description is an instruction, as
 * a schema is, and one wording is what gets tested. What the agent finds in the
 * user's language is what the user sees — the labels, the content.
 */
class AgentContractService
{
    final public const string FILE_EXTENSION = '.ai.yml';

    final public const string OPTION_AGENT_DESCRIPTION = 'agent_description';

    /**
     * The view whose contract a component takes, when its own view has none
     * to offer: a form, drawn from the application's template, is the
     * loader's form to an agent.
     */
    final public const string OPTION_AGENT_CONTRACT = 'agent_contract';

    /**
     * The files already read, by view, with the time they were read at: one
     * changed since — while developing, a worker serving on — is read again.
     * Out of debug the files are the ones deployed with the code, and what
     * was read stays without asking the disk again.
     *
     * @var array<string, array{mtime: int|null, declaration: array|null}>
     */
    #[WorkerSafe('A cache of what the component files say, checked against the files in debug.')]
    private array $declarations = [];

    /**
     * Where each view's contract would be, found once: finding it means
     * loading the template's whole source to learn its path.
     *
     * @var array<string, string|null>
     */
    #[WorkerSafe('Template locations, fixed for the code deployed; a missing one is looked for again in debug.')]
    private array $paths = [];

    public function __construct(
        #[Autowire('%kernel.debug%')]
        private readonly bool $debug = true,
    ) {
    }

    /**
     * The contract the browser is handed for a component that has one, null
     * otherwise. Whether an agent is shown it is settled in the page, where
     * nesting is known: a component saying nothing follows what holds it —
     * an item of an exposed menu is exposed —, so every one carries its own.
     */
    public function forComponent(
        Environment $twig,
        ComponentRenderNode $component,
    ): ?array {
        $contract = $this->resolve($twig, $component->options[self::OPTION_AGENT_CONTRACT] ?? $component->getView());

        if (null === $contract) {
            return null;
        }

        // Where it is drawn may say what this one is for better than its kind.
        if ($description = $component->options[self::OPTION_AGENT_DESCRIPTION] ?? null) {
            $contract['description'] = $description;
        }

        return $contract;
    }

    /**
     * The contract of a view, its parent's merged under it.
     */
    public function resolve(
        Environment $twig,
        string $view,
    ): ?array {
        $declaration = $this->read($twig, $view);

        if (null === $declaration) {
            return null;
        }

        $parent = isset($declaration['extends'])
            ? $this->resolve($twig, $declaration['extends']) ?? []
            : [];

        $actions = $parent['actions'] ?? [];

        foreach ($declaration['actions'] ?? [] as $name => $action) {
            $actions[$name] = $this->buildAction($name, $action ?? []);
        }

        return [
            'type' => $declaration['type'] ?? $parent['type'] ?? null,
            'description' => $declaration['description'] ?? $parent['description'] ?? null,
            'actions' => $actions,
        ];
    }

    /**
     * The file beside the template — a component's, or a vue's —, null when
     * there is none.
     */
    private function read(
        Environment $twig,
        string $view,
    ): ?array {
        $cached = $this->declarations[$view] ?? null;

        if (null !== $cached && ! $this->debug) {
            return $cached['declaration'];
        }

        $path = $this->findPath($twig, $view);
        $mtime = null !== $path && is_file($path) ? filemtime($path) : null;

        if (null !== $cached && $cached['mtime'] === $mtime) {
            return $cached['declaration'];
        }

        $declaration = null !== $mtime ? Yaml::parseFile($path) : null;
        $this->declarations[$view] = ['mtime' => $mtime, 'declaration' => $declaration];

        return $declaration;
    }

    private function findPath(
        Environment $twig,
        string $view,
    ): ?string {
        if (array_key_exists($view, $this->paths)) {
            return $this->paths[$view];
        }

        $path = $this->findFile($twig, $view);

        // While developing, a template not there yet may be by the next page.
        if (null !== $path || ! $this->debug) {
            $this->paths[$view] = $path;
        }

        return $path;
    }

    /**
     * Where the file would be, beside the template — a component's, or a
     * vue's —, null when there is no template to stand beside.
     */
    private function findFile(
        Environment $twig,
        string $view,
    ): ?string {
        $loader = $twig->getLoader();

        foreach ([TemplateHelper::TEMPLATE_FILE_EXTENSION, VueExtension::TEMPLATE_FILE_EXTENSION] as $extension) {
            if ($loader->exists($view . $extension)) {
                return substr(
                    $loader->getSourceContext($view . $extension)->getPath(),
                    0,
                    -strlen($extension)
                ) . self::FILE_EXTENSION;
            }
        }

        // A contract standing alone, beside a script and no template: the
        // loader's form, whose markup is the application's.
        if ($loader->exists($view . self::FILE_EXTENSION)) {
            return $loader->getSourceContext($view . self::FILE_EXTENSION)->getPath();
        }

        return null;
    }

    /**
     * An action as MCP describes a tool, its arguments an object schema even
     * when it takes none.
     */
    private function buildAction(
        string $name,
        array $action,
    ): array {
        $schema = $action['input_schema'] ?? [];
        $schema['type'] ??= 'object';
        $schema['properties'] = empty($schema['properties'])
            ? new stdClass()
            : $schema['properties'];

        return array_filter([
            'name' => $name,
            'description' => $action['description'] ?? null,
            'inputSchema' => $schema,
            'annotations' => $action['annotations'] ?? null,
        ], fn (mixed $value) => null !== $value);
    }
}
