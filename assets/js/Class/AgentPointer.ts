import AgentFrameLayer from './AgentFrameLayer';
import type { AgentCallContext } from '../Interfaces/AgentToolInterface';

// Who a call made by hand is made for.
const CALLER_DEFAULT = 'default';

// What the agents point the user at: elements of the page — nodes, or parts
// of one: a row, a cell —, framed over the page (AgentFrameLayer) for the
// agent that asked, by caller. What an agent points at replaces what it
// pointed at before; an element stays framed while any agent points at it.
// The user acting in a layer of the page — the page, a panel over it —
// takes back every frame of that layer, whoever drew it: what was pointed at
// in the page waits under the panel, and is there again once it closes.
export default class AgentPointer {
  public readonly frames: AgentFrameLayer;

  private pointed: Map<string, HTMLElement[]> = new Map();

  private listening: boolean = false;

  constructor(hostOf: (el: HTMLElement) => HTMLElement | null = () => null) {
    this.frames = new AgentFrameLayer(hostOf);
  }

  // The first element brought into view, all framed. None takes the
  // caller's frames back.
  point(elements: (HTMLElement | null)[], context: AgentCallContext = {}): void {
    const caller = context.caller ?? CALLER_DEFAULT;
    const pointed = elements.filter((el): el is HTMLElement => Boolean(el));
    const before = this.pointed.get(caller) ?? [];

    if (pointed.length) {
      this.pointed.set(caller, pointed);
    } else {
      this.pointed.delete(caller);
    }

    const still = new Set([...this.pointed.values()].flat());

    for (const el of before) {
      if (!still.has(el)) {
        this.frames.hide(el);
      }
    }

    for (const el of pointed) {
      if (!before.includes(el)) {
        this.frames.show(el);
      }
    }

    pointed[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.syncListening();
  }

  private syncListening(): void {
    const wanted = this.pointed.size > 0;

    if (wanted && !this.listening) {
      document.addEventListener('pointerdown', this.release, { capture: true });
    } else if (!wanted && this.listening) {
      document.removeEventListener('pointerdown', this.release, { capture: true });
    }

    this.listening = wanted;
  }

  // The frames of the layer acted in, taken back.
  private release = (event: Event): void => {
    const host = this.frames.hostOf(event.target as Element);

    for (const [caller, elements] of [...this.pointed.entries()]) {
      const kept = elements.filter((el) => {
        if (this.frames.hostOf(el) !== host) {
          return true;
        }

        this.frames.hide(el);

        return false;
      });

      if (kept.length) {
        this.pointed.set(caller, kept);
      } else {
        this.pointed.delete(caller);
      }
    }

    this.syncListening();
  };
}
