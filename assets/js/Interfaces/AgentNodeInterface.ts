import type AgentToolInterface from './AgentToolInterface';
import type { AgentCallContext, AgentToolDefinition } from './AgentToolInterface';

// What a component says of itself to an agent, written in english in the
// `.ai.yml` beside its template and handed over by the server: its kind, what
// it is for, the actions it offers. The script runs them.
export interface AgentContractInterface {
  type: string;
  description?: string;
  actions?: Record<string, AgentToolDefinition>;
}

// How a component runs the actions its contract declares, by name.
export type AgentActionsImplementation = Record<string, (args: Record<string, any>, context?: AgentCallContext) => any | Promise<any>>;

// A component of the page as the agent tools read it, whatever draws it — a
// render node of the loader, a vue —: where it stands, what it says of itself,
// how it runs. Each kind registers its instances with AgentToolsService as
// they mount, and the page is read from that register and the document.
export interface AgentNodeProviderInterface {
  id: string;
  view: string;
  el: HTMLElement | null;
  // `layout`, `page`, `component`, `vue`: what the way to a node names.
  getRenderNodeType(): string;
  getAgentContract(): AgentContractInterface | null;
  // All its actions (true), some by name, none (false), or nothing said —
  // undefined —, the node then shown when what holds it in the page is.
  getAgentExposure(): boolean | string[] | undefined;
  getAgentActions(): AgentActionsImplementation;
  getAgentState(): Record<string, any> | undefined;
  getAgentLabel(): string | undefined;
  // Makes a node it holds visible, before an agent points at it: a folded
  // container unfolds.
  revealAgentChild(child: AgentNodeProviderInterface): Promise<void>;
  // The part of the node a frame goes round: the node, unless the reader
  // sees it as one of its parts — the link of a menu entry.
  getAgentFrameElement(): HTMLElement | null;
}

// A piece of the page as an agent reads it: the contract, with what this one
// shows and is set to, and its actions ready to run. The actions are tools
// without a name of their own in the page: they are reached through the node
// holding them, so two switches each offer their `toggle` without one hiding
// the other.
export default interface AgentNodeInterface {
  // The kind of piece: `switch`, `input`, `menu`…
  type: string;
  label?: string;
  description?: string;
  state?: Record<string, any>;
  actions: AgentToolInterface[];
}
