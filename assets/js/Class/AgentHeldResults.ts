// What a call answers once its page is gone: the call, and what came of it.
export type AgentHeldResult = {
  callId: string;
  call: { name: string; arguments?: Record<string, any> };
  results: any[];
};

// Where the answers of calls that left the page wait for the page reached.
const STORAGE_KEY = 'agentTools.held';

// Past this, an answer nobody came for is dropped: the conversation that
// asked is no longer open in this tab.
const TTL_MS = 2 * 60 * 1000;

// The answers of calls that left the page — a link followed, a form sent —,
// kept in the tab for the conversation that asked, until the page reached
// opens it again and sends them (AbstractEntityChat.sendHeldToolResults).
export default class AgentHeldResults {
  hold(conversation: string, result: AgentHeldResult): void {
    const held = this.read();

    held.push({ conversation, at: Date.now(), result });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(held));
  }

  has(conversation: string): boolean {
    return this.read().some((entry) => entry.conversation === conversation);
  }

  // The answers held for a conversation, given once: taken, they are gone.
  take(conversation: string): AgentHeldResult[] {
    const held = this.read();
    const taken = held.filter((entry) => entry.conversation === conversation);

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(held.filter((entry) => entry.conversation !== conversation))
    );

    return taken.map((entry) => entry.result);
  }

  private read(): { conversation: string; at: number; result: AgentHeldResult }[] {
    try {
      const held = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');

      return Array.isArray(held) ? held.filter((entry) => Date.now() - entry.at < TTL_MS) : [];
    } catch (error) {
      return [];
    }
  }
}
