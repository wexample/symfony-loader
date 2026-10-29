import App from '../Class/App';
import AppService from '../Class/AppService';
import type RenderNode from '../Class/RenderNode';
import type AgentNodeInterface from '../Interfaces/AgentNodeInterface';
import AgentToolInterface, { type AgentToolDefinition } from '../Interfaces/AgentToolInterface';

export const TOOL_LIST = 'list_tools';
export const TOOL_CALL = 'call_tool';
export const TOOL_INSPECT = 'inspect_page';
export const TOOL_ACT = 'act';
export const SCOPE_FRONT = 'front';

// A node as the inspection returns it: its actions without the way they run,
// and the exposed nodes it holds.
type AgentPageNode = Omit<AgentNodeInterface, 'actions'> & {
  id: string;
  actions: AgentToolDefinition[];
  children?: AgentPageNode[];
};

interface AgentToolEntry {
  owner: object;
  tool: AgentToolInterface;
}

// The tools an agent may call in the page as it stands: each render node
// registers its own as it mounts and takes them back as it goes, so the list is
// what the page shows at the moment it is read, and nobody keeps it by hand.
//
// Two nodes may offer a tool of the same name — the same component drawn
// twice —: it is listed once, and run by the one registered last.
export default class AgentToolsService extends AppService {
  public static serviceName: string = 'agentTools';

  private entries: AgentToolEntry[] = [];

  private listeners: Set<() => void> = new Set();

  private callsRun: Set<string> = new Set();

  constructor(app: App) {
    super(app);

    // What the agent is told of in advance — whatever the page holds, these
    // two —: the others come and go with the page, so it finds them by asking
    // for the list, and runs them through the second.
    this.register(this, {
      name: TOOL_LIST,
      description: 'Lists the tools available right now, with what each does and the arguments it takes. Call it before calling any tool.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: [SCOPE_FRONT],
            description: 'Where the tools run: "front" for the page the user is looking at.',
          },
          filter: {
            type: 'string',
            description: 'Only the tools whose name or description contains this text.',
          },
        },
      },
      annotations: { readOnlyHint: true },
      execute: (args) => this.listFor(args.scope ?? SCOPE_FRONT, args.filter),
    });

    this.register(this, {
      name: TOOL_CALL,
      description: `Calls one of the tools ${TOOL_LIST} returned, by its name, with the arguments its schema describes.`,
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          arguments: { type: 'object' },
        },
        required: ['name'],
      },
      execute: (args) => this.call(args.name, args.arguments ?? {}),
    });

    // The page as a tree of what it shows the agent, each piece with its state
    // and what may be done to it — where a piece sits is read from the tree.
    this.register(this, {
      name: TOOL_INSPECT,
      description: `Describes the page the user is looking at: the language it is shown in, and the pieces it shows, nested as they are in the page, each with its state and the actions ${TOOL_ACT} may run on it. Labels are in the page's language, as the user reads them.`,
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Only this piece and what it holds, by its id.' },
          depth: { type: 'integer', minimum: 0, description: 'How many levels of pieces to return, all of them by default.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: (args) => this.inspect(args.node, args.depth ?? Infinity),
    });

    this.register(this, {
      name: TOOL_ACT,
      description: `Runs an action on a piece of the page, both named as ${TOOL_INSPECT} returned them, with the arguments the action's schema describes.`,
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string' },
          action: { type: 'string' },
          arguments: { type: 'object' },
        },
        required: ['node', 'action'],
      },
      execute: (args) => this.act(args.node, args.action, args.arguments ?? {}),
    });
  }

  register(owner: object, tool: AgentToolInterface): void {
    this.entries.push({ owner, tool });
    this.changed();
  }

  unregisterOwner(owner: object): void {
    const count = this.entries.length;
    this.entries = this.entries.filter((entry) => entry.owner !== owner);

    if (this.entries.length !== count) {
      this.changed();
    }
  }

  // Told each time a tool comes or goes — the page changed, a component was
  // drawn or removed. Returns the way to stop listening.
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  list(): AgentToolDefinition[] {
    const definitions = new Map<string, AgentToolDefinition>();

    for (const { tool } of this.entries) {
      const { execute, ...definition } = tool;
      definitions.set(tool.name, definition);
    }

    return [...definitions.values()];
  }

  // The list the agent reads: the page's own tools, not the two it reads them
  // through.
  private listFor(scope: string, filter?: string): AgentToolDefinition[] {
    if (scope !== SCOPE_FRONT) {
      throw new Error(`The page lists its "${SCOPE_FRONT}" tools only.`);
    }

    const needle = filter?.toLowerCase();

    return this.list().filter((tool) => tool.name !== TOOL_LIST
      && tool.name !== TOOL_CALL
      && (!needle || `${tool.name} ${tool.description}`.toLowerCase().includes(needle)));
  }

  has(name: string): boolean {
    return this.find(name) !== null;
  }

  async call(name: string, args: Record<string, any> = {}): Promise<any> {
    const tool = this.find(name);

    if (!tool) {
      throw new Error(`No agent tool "${name}" in the page.`);
    }

    return await tool.execute(args);
  }

  // A call an agent made, run once whatever reaches the page twice — the same
  // message published again, two components listening —: what it returned
  // (`value`), or the error it ended on; null when this call already ran.
  async run(callId: string, name: string, args: Record<string, any> = {}): Promise<{ value?: any; error?: string } | null> {
    if (this.callsRun.has(callId)) {
      return null;
    }
    this.callsRun.add(callId);

    try {
      return { value: await this.call(name, args) };
    } catch (error) {
      return { error: String((error as Error)?.message ?? error) };
    }
  }

  // The pieces, and the language they are labelled in: the contracts are in
  // english, what the user reads is not.
  private inspect(nodeId: string | undefined, depth: number): { locale: string; nodes: AgentPageNode[] } {
    const from = nodeId ? this.findNode(nodeId) : this.app.layout;

    return {
      locale: document.documentElement.lang,
      nodes: from ? this.inspectNode(from, depth) : [],
    };
  }

  // A node the agent is not shown is skipped, what it holds raised to its
  // place: the tree keeps only the pieces, nested as they are in the page.
  private inspectNode(renderNode: RenderNode, depth: number): AgentPageNode[] {
    const node = renderNode.describeForAgent();
    const childDepth = node ? depth - 1 : depth;
    const children = childDepth < 0
      ? []
      : renderNode.eachChildRenderNode().flatMap((child) => this.inspectNode(child, childDepth));

    if (!node) {
      return children;
    }

    return [{
      id: renderNode.id,
      ...node,
      actions: node.actions.map(({ execute, ...action }) => action),
      ...(children.length ? { children } : {}),
    }];
  }

  private async act(nodeId: string, actionName: string, args: Record<string, any>): Promise<any> {
    const node = this.findNode(nodeId)?.describeForAgent();

    if (!node) {
      throw new Error(`No piece "${nodeId}" in the page.`);
    }

    const action = node.actions.find((candidate) => candidate.name === actionName);

    if (!action) {
      throw new Error(`No action "${actionName}" on "${nodeId}": ${node.actions.map((candidate) => candidate.name).join(', ')}.`);
    }

    return await action.execute(args);
  }

  // The render node an id names, wherever it sits under the layout.
  findNode(id: string, from: RenderNode = this.app.layout): RenderNode | null {
    if (from.id === id) {
      return from;
    }

    for (const child of from.eachChildRenderNode()) {
      const found = this.findNode(id, child);

      if (found) {
        return found;
      }
    }

    return null;
  }

  private find(name: string): AgentToolInterface | null {
    for (let index = this.entries.length - 1; index >= 0; index--) {
      if (this.entries[index].tool.name === name) {
        return this.entries[index].tool;
      }
    }

    return null;
  }
}
