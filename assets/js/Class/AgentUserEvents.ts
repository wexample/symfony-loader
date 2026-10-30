// What the user did in the page, as told to the agent at its next turn.
export type AgentUserEvent = {
  at: number;
  // `navigate`, `overlay`, `node`: a page reached, a veil opened or closed,
  // something done to a component.
  kind: string;
  // In english, as the agent reads it: 'Switched "Theme" on'.
  summary: string;
  // How many times in a row the same thing was done.
  count: number;
  node?: { type?: string; label?: string };
  detail?: Record<string, any>;
};

// An event as kept, with what makes it the same thing done again: the key
// stays in the tab, across pages, and goes before the agent reads it.
type AgentUserEventKept = AgentUserEvent & { key: string };

// What a component says when the user did something to it: dispatched on
// its element, bubbling, and written down by the agent tools.
export const EVENT_AGENT = 'agent:event';

export type AgentUserEventDetail = {
  summary: string;
  kind?: string;
  // What makes two events the same thing done again — the node and the
  // action, by default the summary —, so that forty presses are one line.
  key?: string;
  node?: { type?: string; label?: string };
  detail?: Record<string, any>;
};

const STORAGE_KEY = 'agentTools.userEvents';

// Written before the page is left for the agent, read by the page reached:
// that navigation is not the user's.
const STORAGE_KEY_AGENT_LEFT = 'agentTools.agentLeft';

const AGENT_LEFT_TTL_MS = 15 * 1000;

// How many events are kept: the last ones, the older dropped.
const LIMIT = 10;

// What the user did since the agent last heard from the page: kept in the
// tab across pages, the same thing done again counted rather than written
// again, taken all at once when something is sent to the agent. What the
// agent did itself is not written down: it knows.
export default class AgentUserEvents {
  private listeners: Set<() => void> = new Set();

  private ignoredUntil: number = 0;

  record(event: AgentUserEventDetail): void {
    if (Date.now() < this.ignoredUntil) {
      return;
    }

    const events = this.read();
    const key = event.key ?? `${event.kind ?? 'node'}:${event.summary}`;
    const last = events[events.length - 1];

    if (last && last.key === key) {
      last.count += 1;
      last.at = Date.now();
      last.summary = event.summary;
      last.detail = event.detail;
    } else {
      events.push({
        at: Date.now(),
        kind: event.kind ?? 'node',
        summary: event.summary,
        count: 1,
        ...(event.node ? { node: event.node } : {}),
        ...(event.detail ? { detail: event.detail } : {}),
        key,
      });
    }

    while (events.length > LIMIT) {
      events.shift();
    }

    this.write(events);
  }

  all(): AgentUserEvent[] {
    return this.read().map(({ key, ...event }) => event);
  }

  // Given once: taken, they are gone.
  take(): AgentUserEvent[] {
    const events = this.all();

    this.clear();

    return events;
  }

  clear(): void {
    this.write([]);
  }

  // Nothing written for a while: what the page does after an agent's action
  // — a veil opened by its press — is the agent's.
  ignoreFor(ms: number): void {
    this.ignoredUntil = Math.max(this.ignoredUntil, Date.now() + ms);
  }

  // Said before the agent's action leaves the page.
  agentLeaving(): void {
    sessionStorage.setItem(STORAGE_KEY_AGENT_LEFT, String(Date.now()));
  }

  // Whether the page was reached by the agent's doing, asked once.
  arrivedFromAgent(): boolean {
    const left = Number(sessionStorage.getItem(STORAGE_KEY_AGENT_LEFT) ?? 0);

    sessionStorage.removeItem(STORAGE_KEY_AGENT_LEFT);

    return left > 0 && Date.now() - left < AGENT_LEFT_TTL_MS;
  }

  // Told each time the log changes. Returns the way to stop listening.
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private read(): AgentUserEventKept[] {
    try {
      const events = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');

      return Array.isArray(events) ? events : [];
    } catch (error) {
      return [];
    }
  }

  private write(events: AgentUserEventKept[]): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    for (const listener of this.listeners) {
      listener();
    }
  }
}
