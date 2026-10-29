import type AgentToolInterface from './AgentToolInterface';
import type { AgentToolDefinition } from './AgentToolInterface';

// What a component says of itself to an agent, written in english in the
// `.ai.yml` beside its template and handed over by the server: its kind, what
// it is for, the actions it offers. The script runs them.
export interface AgentContractInterface {
  type: string;
  description?: string;
  actions: Record<string, AgentToolDefinition>;
}

// How a component runs the actions its contract declares, by name.
export type AgentActionsImplementation = Record<string, (args: Record<string, any>) => any | Promise<any>>;

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
