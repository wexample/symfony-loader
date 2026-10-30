import AgentHeldResults from '../Class/AgentHeldResults';
import AgentNavigation from '../Class/AgentNavigation';
import AgentPointer from '../Class/AgentPointer';
import AgentUserEvents, { EVENT_AGENT, type AgentUserEventDetail } from '../Class/AgentUserEvents';
import AgentPage, { type AgentPageNode } from '../Class/AgentPage';
import App from '../Class/App';
import AppService from '../Class/AppService';
import type { AgentNodeProviderInterface } from '../Interfaces/AgentNodeInterface';
import AgentToolInterface, { type AgentCallContext, type AgentToolDefinition } from '../Interfaces/AgentToolInterface';

export const TOOL_LIST = 'list_tools';
export const TOOL_CALL = 'call_tool';
export const TOOL_INSPECT = 'inspect_page';
export const TOOL_ACT = 'act';
export const TOOL_FIND = 'find_nodes';
export const TOOL_FOCUS = 'focus';
export const SCOPE_FRONT = 'front';

interface AgentToolEntry {
  owner: object;
  tool: AgentToolInterface;
}

// What an agent may do in the page as it stands: the tools, each registered
// by whoever offers it as it mounts and taken back as it goes, and the nodes
// — the components with a contract, whatever draws them — read as a page
// (AgentPage) by the tools of the page itself: inspecting, finding, acting,
// focusing. So the list is what the page shows at the moment it is read, and
// nobody keeps it by hand.
//
// Two nodes may offer a tool of the same name — the same component drawn
// twice —: it is listed once, and run by the one registered last.
//
// What a call leaves behind is kept apart: the answers of calls that left
// the page (`held`), and what the agents point the user at (`pointer`).
// What the user does meanwhile is written down (`events`), for the agent to
// read at its next turn: the pages reached, the veils opened, what the
// components say they were done (`agent:event`) — not what the agent did
// itself, which it knows.
export default class AgentToolsService extends AppService {
  public static serviceName: string = 'agentTools';

  public readonly held: AgentHeldResults = new AgentHeldResults();

  // Frames drawn on the layer of the page their element stands on: an
  // overlay's, or the page's.
  public readonly pointer: AgentPointer = new AgentPointer((el) => this.app.services.overlay?.layerOf(el) ?? null);

  public readonly events: AgentUserEvents = new AgentUserEvents();

  // How many of the agent's calls are running: what the components say
  // meanwhile is the agent's doing.
  private acting: number = 0;

  // How long after an agent's action left the page — or pressed what opens a
  // veil — the page is still taken to act on its behalf.
  private static readonly AGENT_ACTION_SETTLE_MS = 3000;

  private entries: AgentToolEntry[] = [];

  private listeners: Set<() => void> = new Set();

  private callsRun: Set<string> = new Set();

  private nodes: Set<AgentNodeProviderInterface> = new Set();

  constructor(app: App) {
    super(app);

    document.addEventListener(EVENT_AGENT, this.onAgentEvent);
    this.recordNavigation();

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
      description: `Calls one of the tools ${TOOL_LIST} returned, by its name, with the arguments its schema describes — {name: "${TOOL_ACT}", arguments: {node, action, arguments}}: the tool's arguments go in "arguments", never beside the name.`,
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          arguments: { type: 'object' },
        },
        required: ['name'],
      },
      // Arguments given flat beside the name — `{name, query}` — are taken
      // as the tool's, as they were meant; a piece and an action given with
      // no name at all are what `act` takes.
      execute: ({ name, arguments: given, ...flat }, context) => {
        const args = given ?? flat;

        if (!name && (args.node || flat.node) && (args.action || flat.action)) {
          return this.call(TOOL_ACT, { ...flat, ...args }, context);
        }

        return this.call(name, args, context);
      },
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
      // Arguments given flat beside the node and the action are taken as
      // the action's, as they were meant.
      execute: ({ node, action, arguments: given, ...flat }, context) => this.act(node, action, given ?? flat, context),
    });

    this.register(this, {
      name: TOOL_FIND,
      description: `Finds the pieces of the page whose kind, label or description holds a text — "signature", "theme" —, each with its id, its state, its actions and the way to it from the top of the page (what holds it, the nearest first). Cheaper than ${TOOL_INSPECT} when looking for one thing.`,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          type: { type: 'string', description: 'Only pieces of this kind: "menu-item", "switch"…' },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      execute: (args) => {
        if (!String(args.query ?? '').trim()) {
          throw new Error('find_nodes needs a query: the text looked for in the pieces\' kind, label or description.');
        }

        return this.page().find(String(args.query), args.type);
      },
    });

    this.register(this, {
      name: TOOL_FOCUS,
      description: 'Shows the user pieces of the page: opens what hides them — a folded menu, a closed group —, scrolls to the first and outlines them all, until the user does something in the page or this tool is called again. Called with no piece, takes the outlines back. Changes nothing else.',
      inputSchema: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: { type: 'string' },
            description: `The ids of the pieces, as ${TOOL_FIND} or ${TOOL_INSPECT} returned them.`,
          },
        },
        required: ['nodes'],
      },
      annotations: { idempotentHint: true },
      execute: (args, context) => this.focus(args.nodes ?? [], context),
    });
  }

  registerNode(node: AgentNodeProviderInterface): void {
    this.nodes.add(node);
  }

  unregisterNode(node: AgentNodeProviderInterface): void {
    this.nodes.delete(node);
  }

  // The node drawn on an element, if one is: what a form asks of the button
  // that sends it.
  nodeFor(el: Element | null | undefined): AgentNodeProviderInterface | null {
    if (!el) {
      return null;
    }

    for (const node of this.nodes) {
      if (node.el === el) {
        return node;
      }
    }

    return null;
  }

  // The page as an agent reads it, now.
  page(): AgentPage {
    return new AgentPage(this.nodes);
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

  async call(name: string, args: Record<string, any> = {}, context: AgentCallContext = {}): Promise<any> {
    const tool = this.find(name);

    if (!name) {
      throw new Error(`${TOOL_CALL} needs the name of the tool to run, as ${TOOL_LIST} returned it, and its arguments beside: {name: "${TOOL_ACT}", arguments: {node, action, arguments}}.`);
    }

    if (!tool) {
      throw new Error(`No agent tool "${name}" in the page: ${TOOL_LIST} returns the ones there are.`);
    }

    return await tool.execute(args, context);
  }

  // A call an agent made, run once whatever reaches the page twice — the same
  // message published again, two components listening —: what it returned
  // (`value`), or the error it ended on; null when this call already ran.
  //
  // A call leaving the page says where it goes (`navigation`): its value is
  // what to tell the agent, and the caller holds it before going. A call
  // that reads and changes nothing says so (`readOnly`): nothing of the page
  // is worth waiting for after it.
  async run(callId: string, name: string, args: Record<string, any> = {}, context: AgentCallContext = {}): Promise<{ value?: any; error?: string; navigation?: AgentNavigation; readOnly?: boolean } | null> {
    if (this.callsRun.has(callId)) {
      return null;
    }
    this.callsRun.add(callId);

    // Read before the call: one that leaves the page takes its nodes with it.
    const readOnly = this.isReadOnly(name, args);

    this.acting += 1;

    try {
      const value = await this.call(name, args, context);

      return value instanceof AgentNavigation
        ? { value: value.value, navigation: this.leavingAs(value), readOnly }
        : { value, readOnly };
    } catch (error) {
      return { error: String((error as Error)?.message ?? error), readOnly };
    } finally {
      this.acting -= 1;
      if (!readOnly) {
        this.events.ignoreFor(AgentToolsService.AGENT_ACTION_SETTLE_MS);
      }
    }
  }

  // The navigation an action returned, said to be the agent's before it
  // goes: the page reached does not write it down as the user's.
  private leavingAs(navigation: AgentNavigation): AgentNavigation {
    return new AgentNavigation(() => {
      this.events.agentLeaving();
      this.events.ignoreFor(AgentToolsService.AGENT_ACTION_SETTLE_MS);
      navigation.go();
    }, navigation.value);
  }

  // What a component says the user did to it, written down unless an agent
  // is acting.
  private onAgentEvent = (event: Event): void => {
    const detail = (event as CustomEvent<AgentUserEventDetail>).detail;

    if (this.acting > 0 || !detail?.summary) {
      return;
    }

    this.events.record(detail);
  };

  // The page reached, unless the agent brought the user here.
  private recordNavigation(): void {
    if (this.events.arrivedFromAgent()) {
      return;
    }

    const where = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    this.events.record({
      kind: 'navigate',
      key: `navigate:${where}`,
      summary: `Opened the page "${document.title}" (${where})`,
      detail: { url: window.location.href, title: document.title },
    });
  }

  // Whether a call only reads, as its tool says — or, through `call_tool`
  // and `act`, as the tool or the action it reaches says.
  private isReadOnly(name: string, args: Record<string, any>): boolean {
    if (name === TOOL_CALL) {
      const { name: target, arguments: given, ...flat } = args;

      return this.isReadOnly(target, given ?? flat);
    }

    if (name === TOOL_ACT) {
      const page = this.page();
      const node = args.node ? page.get(args.node) : null;
      const action = node ? page.describe(node)?.actions.find((candidate) => candidate.name === args.action) : null;

      return Boolean(action?.annotations?.readOnlyHint);
    }

    return Boolean(this.find(name)?.annotations?.readOnlyHint);
  }

  // The pieces, and the language they are labelled in: the contracts are in
  // english, what the user reads is not.
  private inspect(nodeId: string | undefined, depth: number): { locale: string; nodes: AgentPageNode[] } {
    const page = this.page();
    const from = nodeId ? page.get(nodeId) : null;

    if (nodeId && !from) {
      throw new Error(`No piece "${nodeId}" in the page.`);
    }

    return {
      locale: document.documentElement.lang,
      nodes: page.tree(from, depth),
    };
  }

  private async act(nodeId: string, actionName: string, args: Record<string, any>, context: AgentCallContext = {}): Promise<any> {
    const page = this.page();
    const renderNode = page.get(nodeId);
    const node = renderNode ? page.describe(renderNode) : null;

    if (!node) {
      throw new Error(`No piece "${nodeId}" in the page.`);
    }

    const action = node.actions.find((candidate) => candidate.name === actionName);

    if (!action) {
      throw new Error(`No action "${actionName}" on "${nodeId}": ${node.actions.map((candidate) => candidate.name).join(', ')}.`);
    }

    return await action.execute(args, context);
  }

  // Each container holding a node, the outermost first, makes way for it;
  // then the page brings the first into view, and frames them all for the
  // agent that asked.
  private async focus(nodeIds: string[], context: AgentCallContext = {}): Promise<AgentPageNode[]> {
    const page = this.page();
    const nodes = nodeIds.map((nodeId) => {
      const node = page.get(nodeId);

      if (!node || !page.describe(node)) {
        throw new Error(`No piece "${nodeId}" in the page.`);
      }

      return node;
    });

    for (const node of nodes) {
      for (const ancestor of page.ancestors(node).reverse()) {
        await ancestor.revealAgentChild(node);
      }
    }

    this.pointer.point(nodes.map((node) => node.getAgentFrameElement()), context);

    return nodes.map((node) => ({ ...page.toPageNode(node), path: page.path(node) }));
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
