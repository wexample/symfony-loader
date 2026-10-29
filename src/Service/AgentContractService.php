<?php

namespace Wexample\SymfonyLoader\Service;

use stdClass;
use Symfony\Component\Yaml\Yaml;
use Twig\Environment;
use Wexample\SymfonyHelpers\Attribute\WorkerSafe;
use Wexample\SymfonyLoader\Rendering\RenderNode\ComponentRenderNode;
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

    final public const string OPTION_AGENT = 'agent';

    final public const string OPTION_AGENT_DESCRIPTION = 'agent_description';

    /** @var array<string, array|null> The contracts already read, by view. */
    #[WorkerSafe('A cache of what the component files say, the same for every request.')]
    private array $contracts = [];

    /**
     * The contract the browser is handed for a component an agent is shown,
     * null for one with no contract. One that has a contract and is not shown
     * travels with its kind alone, so a page can say what it could show.
     */
    public function forComponent(
        Environment $twig,
        ComponentRenderNode $component,
    ): ?array {
        $contract = $this->resolve($twig, $component->getView());

        if (null === $contract) {
            return null;
        }

        if (! ($component->options[self::OPTION_AGENT] ?? false)) {
            return ['type' => $contract['type']];
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
        if (array_key_exists($view, $this->contracts)) {
            return $this->contracts[$view];
        }

        $declaration = $this->read($twig, $view);

        if (null === $declaration) {
            return $this->contracts[$view] = null;
        }

        $parent = isset($declaration['extends'])
            ? $this->resolve($twig, $declaration['extends']) ?? []
            : [];

        $actions = $parent['actions'] ?? [];

        foreach ($declaration['actions'] ?? [] as $name => $action) {
            $actions[$name] = $this->buildAction($name, $action ?? []);
        }

        return $this->contracts[$view] = [
            'type' => $declaration['type'] ?? $parent['type'] ?? null,
            'description' => $declaration['description'] ?? $parent['description'] ?? null,
            'actions' => $actions,
        ];
    }

    /**
     * The file beside the template, null when the component has none.
     */
    private function read(
        Environment $twig,
        string $view,
    ): ?array {
        $template = $view . TemplateHelper::TEMPLATE_FILE_EXTENSION;
        $loader = $twig->getLoader();

        if (! $loader->exists($template)) {
            return null;
        }

        $path = substr(
            $loader->getSourceContext($template)->getPath(),
            0,
            -strlen(TemplateHelper::TEMPLATE_FILE_EXTENSION)
        ) . self::FILE_EXTENSION;

        return is_file($path) ? Yaml::parseFile($path) : null;
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
