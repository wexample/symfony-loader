import AppService from '../Class/AppService';
import AgentToolInterface, { type AgentToolDefinition } from '../Interfaces/AgentToolInterface';

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

  private find(name: string): AgentToolInterface | null {
    for (let index = this.entries.length - 1; index >= 0; index--) {
      if (this.entries[index].tool.name === name) {
        return this.entries[index].tool;
      }
    }

    return null;
  }
}
