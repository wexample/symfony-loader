// Something an agent may do in the page, described as MCP describes a tool —
// and WebMCP, its browser counterpart — so that whatever reads the list, our
// own chat or an agent from outside, reads a shape it already knows.
export interface AgentToolAnnotationsInterface {
  title?: string;
  // Reads the page and changes nothing.
  readOnlyHint?: boolean;
  // Changes something that cannot be taken back.
  destructiveHint?: boolean;
  // Called twice with the same arguments, leaves the page as called once.
  idempotentHint?: boolean;
}

// Who a call is made for: the conversation that asked, so that what a tool
// leaves in the page — an outline — is that agent's, beside another's.
// Absent for a call made by hand (the develop toolbar).
export type AgentCallContext = {
  caller?: string;
};

export default interface AgentToolInterface {
  name: string;
  description: string;
  // A JSON schema of the arguments, `type: object` at its root.
  inputSchema: Record<string, any>;
  annotations?: AgentToolAnnotationsInterface;
  execute(args: Record<string, any>, context?: AgentCallContext): any | Promise<any>;
}

// What the list says of a tool: everything but the way it runs.
export type AgentToolDefinition = Omit<AgentToolInterface, 'execute'>;
