import type AgentNodeInterface from '../Interfaces/AgentNodeInterface';
import type { AgentNodeProviderInterface } from '../Interfaces/AgentNodeInterface';
import type { AgentToolDefinition } from '../Interfaces/AgentToolInterface';

// A node as an agent is handed it: its actions without the way they run, the
// exposed nodes it holds, or the way to it from the top of the page.
export type AgentPageNode = Omit<AgentNodeInterface, 'actions'> & {
  id: string;
  actions: AgentToolDefinition[];
  children?: AgentPageNode[];
  path?: string[];
};

// The page as an agent reads it, taken at one moment: every node registered
// (AgentToolsService) and standing in the document, nested as its element is
// — not as any render tree holds it, where an item of the side menu is the
// layout's and not the menu's, and a vue's parts are nobody's.
//
// A node is shown when it says so (`agent` where it is drawn) or, saying
// nothing, when what holds it is — a component that said, or an element
// marked `data-agent` (`="false"` to hold back): exposing the side menu
// exposes its items, marking the body exposes the application.
export default class AgentPage {
  private readonly nodes: AgentNodeProviderInterface[];

  private readonly parents = new Map<AgentNodeProviderInterface, AgentNodeProviderInterface | null>();

  private readonly exposures = new Map<AgentNodeProviderInterface, boolean | string[]>();

  private readonly byEl = new Map<Element, AgentNodeProviderInterface>();

  constructor(registered: Iterable<AgentNodeProviderInterface>) {
    this.nodes = [...registered]
      .filter((node) => node.el?.isConnected)
      .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    for (const node of this.nodes) {
      if (!this.byEl.has(node.el)) {
        this.byEl.set(node.el, node);
      }
    }

    for (const node of this.nodes) {
      let el = node.el.parentElement;
      let parent: AgentNodeProviderInterface | null = null;

      while (el && !parent) {
        parent = this.byEl.get(el) ?? null;
        el = el.parentElement;
      }

      this.parents.set(node, parent);
    }
  }

  all(): AgentNodeProviderInterface[] {
    return this.nodes;
  }

  get(id: string): AgentNodeProviderInterface | null {
    return this.nodes.find((node) => node.id === id) ?? null;
  }

  exposureOf(node: AgentNodeProviderInterface): boolean | string[] {
    if (!this.exposures.has(node)) {
      const own = node.getAgentExposure();

      this.exposures.set(node, own !== undefined ? own : this.inheritedExposure(node.el));
    }

    return this.exposures.get(node);
  }

  // The nearest word on it, going up from the element: a component that
  // said, or a marked element. Nothing said up to the top is no.
  private inheritedExposure(from: HTMLElement): boolean {
    for (let el: HTMLElement | null = from; el; el = el.parentElement) {
      const holder = el === from ? null : this.byEl.get(el);

      if (holder && holder.getAgentExposure() !== undefined) {
        return Boolean(this.exposureOf(holder));
      }

      if (el.dataset.agent !== undefined) {
        return el.dataset.agent !== 'false';
      }
    }

    return false;
  }

  // What a node is to the agent, for the exposure the page settled: its
  // contract, joined to what it shows and is set to now and to the way it
  // runs each action. Null when it is not shown. An action declared and not
  // run is left out — said, in the console, for whoever wrote the component.
  describe(node: AgentNodeProviderInterface): AgentNodeInterface | null {
    const exposure = this.exposureOf(node);
    const contract = exposure ? node.getAgentContract() : null;

    if (!contract) {
      return null;
    }

    const implementation = node.getAgentActions();
    const actions = Object.values(contract.actions ?? {})
      .filter((action) => !Array.isArray(exposure) || exposure.includes(action.name))
      .flatMap((action) => {
        if (!implementation[action.name]) {
          console.warn(`"${node.view}" declares the agent action "${action.name}" and does not run it.`);
          return [];
        }

        return [{ ...action, execute: implementation[action.name] }];
      });

    return {
      type: contract.type,
      label: node.getAgentLabel(),
      description: contract.description,
      state: node.getAgentState(),
      actions,
    };
  }

  // Whether a node has a contract, and whether it is shown: for whoever
  // checks a page, not for the agent.
  statusOf(node: AgentNodeProviderInterface): { type: string; exposed: boolean } | null {
    const contract = node.getAgentContract();

    return contract ? { type: contract.type, exposed: Boolean(this.exposureOf(node)) } : null;
  }

  // What holds a node in the page, the nearest first.
  ancestors(node: AgentNodeProviderInterface): AgentNodeProviderInterface[] {
    const ancestors = [];

    for (let parent = this.parents.get(node); parent; parent = this.parents.get(parent)) {
      ancestors.push(parent);
    }

    return ancestors;
  }

  // The way to a node from the page's top, the nearest first, told by what
  // a reader would name: the pieces with a contract, the page, the layout.
  path(node: AgentNodeProviderInterface): string[] {
    return this.ancestors(node).flatMap((ancestor) => {
      const contract = ancestor.getAgentContract();

      if (contract) {
        const label = ancestor.getAgentLabel();

        return [label ? `${contract.type} "${label}"` : contract.type];
      }

      const type = ancestor.getRenderNodeType();

      return type === 'page' || type === 'layout' ? [type] : [];
    });
  }

  // The tree of exposed nodes under one of them, or under the page's top:
  // a node not shown is skipped, what it holds raised to its place.
  tree(from: AgentNodeProviderInterface | null, depth: number): AgentPageNode[] {
    if (depth < 0) {
      return [];
    }

    return this.nodes
      .filter((node) => this.describe(node) && this.nearestExposedAncestor(node) === from)
      .map((node) => {
        const children = this.tree(node, depth - 1);

        return {
          ...this.toPageNode(node),
          ...(children.length ? { children } : {}),
        };
      });
  }

  // The exposed nodes whose kind, label or description holds the text, each
  // with the way to it.
  find(query: string, type?: string): AgentPageNode[] {
    const needle = query.toLowerCase();

    return this.nodes
      .filter((node) => {
        const described = this.describe(node);

        return described
          && (!type || described.type === type)
          && `${described.type} ${described.label ?? ''} ${described.description ?? ''}`.toLowerCase().includes(needle);
      })
      .map((node) => ({ ...this.toPageNode(node), path: this.path(node) }));
  }

  toPageNode(node: AgentNodeProviderInterface): AgentPageNode {
    const { actions, ...described } = this.describe(node);

    return {
      id: node.id,
      ...described,
      actions: actions.map(({ execute, ...action }) => action),
    };
  }

  private nearestExposedAncestor(node: AgentNodeProviderInterface): AgentNodeProviderInterface | null {
    return this.ancestors(node).find((ancestor) => this.describe(ancestor)) ?? null;
  }
}
