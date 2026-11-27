// That an agent is at work in the page, said over the whole window while it
// lasts: a line of the agent's colour along the window's edges, breathing,
// and at its foot a pill naming it with the way to stop it — the only part
// the pointer reaches, the rest letting every click through.
//
// Held by whatever knows the agent is working — a tool call running
// (AgentToolsService), a chat awaiting the agent's answer —, each under a key
// of its own: shown while any holds it, let go a moment after the last one
// did, so that the gap between two calls of one turn does not blink it.
// Drawn by the loader, painted by the design system (shapes/agent-presence).
export default class AgentPresence {
  // How long the presence stays once nothing holds it: the time an agent
  // takes between two calls of one turn.
  public static readonly RELEASE_DELAY_MS: number = 900;

  private holds: Set<string> = new Set();

  private el: HTMLElement | null = null;

  private releaseTimer: number | null = null;

  constructor(
    private readonly labels: () => { working: string; stop: string },
    private readonly onStop: () => void,
  ) {}

  public get shown(): boolean {
    return this.holds.size > 0;
  }

  hold(key: string): void {
    this.holds.add(key);
    this.cancelRelease();
    this.show();
  }

  release(key: string): void {
    if (!this.holds.delete(key) || this.holds.size) {
      return;
    }

    this.cancelRelease();
    this.releaseTimer = window.setTimeout(() => {
      this.releaseTimer = null;
      if (!this.holds.size) {
        this.hide();
      }
    }, AgentPresence.RELEASE_DELAY_MS);
  }

  // Every hold let go at once: the user stopped the agent.
  clear(): void {
    this.holds.clear();
    this.cancelRelease();
    this.hide();
  }

  private show(): void {
    const el = this.el ?? this.create();

    // Drawn first, then shown: the class change is what fades it in.
    requestAnimationFrame(() => el.classList.add('agent-presence--shown'));
  }

  private hide(): void {
    this.el?.classList.remove('agent-presence--shown');
  }

  private cancelRelease(): void {
    if (this.releaseTimer !== null) {
      window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
  }

  private create(): HTMLElement {
    const labels = this.labels();
    const el = document.createElement('div');
    el.className = 'agent-presence';
    // The design system's pieces: a floating capsule holding the agent's led,
    // beating, and a flat compact button.
    el.innerHTML = '<div class="agent-presence--edge" aria-hidden="true"></div>'
      + '<div class="capsule capsule--floating agent-presence--pill" role="status">'
      + '<span class="led led--accent led--pulse"><span class="led--dot" aria-hidden="true"></span><span class="led--label"></span></span>'
      + '<button type="button" class="button button--flat button--compact agent-presence--stop"></button>'
      + '</div>';
    el.querySelector('.led--label')!.textContent = labels.working;

    const stop = el.querySelector<HTMLButtonElement>('.agent-presence--stop')!;
    stop.textContent = labels.stop;
    stop.addEventListener('click', () => this.onStop());

    document.body.appendChild(el);

    return this.el = el;
  }
}
