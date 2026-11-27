// The agent's pointer: a dot of the agent's colour going to what it is about
// to act on, so the user sees where the agent's hand is before it acts.
//
// It moves as a hand does: along an arc, always bent to the same side, leaving
// aside and coming in straight on its target; longer the farther it goes and
// the smaller the target (Fitts),
// speeding up then braking on arrival (minimum jerk), a short trail behind it
// while it moves. It settles on arriving, pinches when it presses, and fades
// once the agent leaves it idle; it comes in from the agent's side — the
// window's end, where its chat stands. Without movement (`prefers-reduced-
// motion`) it fades from one target to the next.
//
// Drawn by the loader, painted by the design system (shapes/agent-cursor).
type Point = { x: number; y: number };

export default class AgentCursor {
  // Fitts: a fixed time, plus a time per bit of difficulty — how far against
  // how big.
  public static readonly BASE_MS: number = 260;

  public static readonly BIT_MS: number = 115;

  public static readonly MAX_MS: number = 950;

  // How far the curve bends aside, a share of the distance; a move shorter
  // than STRAIGHT_BELOW pixels goes straight.
  public static readonly CURVE: number = 0.14;

  public static readonly STRAIGHT_BELOW: number = 80;

  // Dots of the trail, and how many frames behind each the one before.
  public static readonly TRAIL: number = 4;

  public static readonly TRAIL_GAP: number = 3;

  // How long it waits idle before fading.
  public static readonly IDLE_MS: number = 2200;

  // The time a press takes, from the pinch to the release.
  public static readonly PRESS_MS: number = 140;

  private el: HTMLElement | null = null;

  private trail: HTMLElement[] = [];

  private position: Point | null = null;

  private moving: number = 0;

  private idleTimer: number | null = null;

  private get reducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  // To the element — brought into view first —, at its middle, or a point
  // of the window. Resolves on arrival.
  async moveTo(target: HTMLElement | Point | null | undefined): Promise<void> {
    if (!target) {
      return;
    }

    const point = target instanceof HTMLElement ? await this.pointOf(target) : target;
    const size = target instanceof HTMLElement ? this.sizeOf(target) : 24;

    this.ensure();
    this.cancelIdle();

    const from = this.position ?? this.entry();
    this.el!.classList.add('agent-cursor--shown');

    if (this.reducedMotion) {
      await this.jump(from, point);
    } else {
      await this.glide(from, point, size);
    }

    this.position = point;
    this.settle();
    this.scheduleIdle();
  }

  // A press where it stands: pinched, then released.
  async press(): Promise<void> {
    if (!this.el) {
      return;
    }

    this.cancelIdle();
    this.el.classList.add('agent-cursor--pressed');
    await this.wait(AgentCursor.PRESS_MS);
    this.el.classList.remove('agent-cursor--pressed');
    this.scheduleIdle();
  }

  // Where it stands, for a wave started from it.
  get at(): Point | null {
    return this.position;
  }

  hide(): void {
    this.cancelIdle();
    this.el?.classList.remove('agent-cursor--shown');
    this.trail.forEach((dot) => (dot.style.opacity = '0'));
    // Gone: it comes in again from the agent's side.
    this.position = null;
  }

  private async glide(from: Point, to: Point, size: number): Promise<void> {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      this.place(to);
      return;
    }

    const duration = Math.min(
      AgentCursor.MAX_MS,
      AgentCursor.BASE_MS + AgentCursor.BIT_MS * Math.log2(distance / Math.max(size, 8) + 1)
    );

    // The bend: a hand's arc, always to the same side of the way — two moves
    // in a row bent opposite ways read as a zigzag — and more at the start
    // than at the end: the hand leaves in an arc and comes in straight on its
    // target, as one aims (a cubic curve, its first handle aside, its second
    // on the line). Short moves are straight.
    const bend = distance < AgentCursor.STRAIGHT_BELOW
      ? 0
      : distance * AgentCursor.CURVE * (0.85 + Math.random() * 0.3);
    const normal = { x: -dy / distance, y: dx / distance };
    const first = {
      x: from.x + dx * 0.3 + normal.x * bend,
      y: from.y + dy * 0.3 + normal.y * bend,
    };
    const second = {
      x: from.x + dx * 0.75,
      y: from.y + dy * 0.75,
    };

    const run = ++this.moving;
    const history: Point[] = [];
    const start = performance.now();

    this.el!.classList.add('agent-cursor--moving');

    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        // Another move started: this one gives way.
        if (run !== this.moving) {
          resolve();
          return;
        }

        const t = Math.min(1, (now - start) / duration);
        // Minimum jerk: 10t³ − 15t⁴ + 6t⁵.
        const s = t * t * t * (10 - 15 * t + 6 * t * t);
        const u = 1 - s;
        const point = {
          x: u * u * u * from.x + 3 * u * u * s * first.x + 3 * u * s * s * second.x + s * s * s * to.x,
          y: u * u * u * from.y + 3 * u * u * s * first.y + 3 * u * s * s * second.y + s * s * s * to.y,
        };

        this.place(point);
        history.unshift(point);
        this.drawTrail(history, t);

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });

    this.el!.classList.remove('agent-cursor--moving');
    this.trail.forEach((dot) => (dot.style.opacity = '0'));
  }

  // Without movement: gone from where it was, there where it goes.
  private async jump(from: Point, to: Point): Promise<void> {
    this.place(from);
    this.el!.classList.remove('agent-cursor--shown');
    await this.wait(120);
    this.place(to);
    this.el!.classList.add('agent-cursor--shown');
  }

  // The trail: dots on the way behind, smaller and fainter the farther,
  // gone as the move ends.
  private drawTrail(history: Point[], t: number): void {
    const fade = 1 - t * t;

    this.trail.forEach((dot, index) => {
      const point = history[(index + 1) * AgentCursor.TRAIL_GAP];

      if (!point) {
        dot.style.opacity = '0';
        return;
      }

      const rank = 1 - (index + 1) / (AgentCursor.TRAIL + 1);
      dot.style.transform = `translate(${point.x}px, ${point.y}px) scale(${0.35 + 0.45 * rank})`;
      dot.style.opacity = String(0.5 * rank * fade);
    });
  }

  // Its position is `translate`, never `transform`: the browser applies the
  // `scale` of its moods — the settle, the pinch — before `transform`, which
  // would scale the position too and throw the dot across the window.
  private place(point: Point): void {
    this.el!.style.translate = `${point.x}px ${point.y}px`;
  }

  // On arriving: a small settle, the hand finding its spot.
  private settle(): void {
    const el = this.el!;
    el.classList.remove('agent-cursor--settle');
    void el.offsetWidth;
    el.classList.add('agent-cursor--settle');
  }

  // Where it comes in from: the agent's side, the window's end — where its
  // chat stands —, at mid-height.
  private entry(): Point {
    const entry = { x: window.innerWidth - 32, y: window.innerHeight * 0.55 };
    this.place(entry);
    // Drawn there first, then shown: the fade happens in place.
    void this.el!.offsetWidth;
    this.el!.classList.add('agent-cursor--shown');

    return entry;
  }

  // The element's middle once it stands in view.
  private async pointOf(el: HTMLElement): Promise<Point> {
    const rect = el.getBoundingClientRect();
    const outside = rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth;

    if (outside) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: this.reducedMotion ? 'auto' : 'smooth' });
      await this.wait(this.reducedMotion ? 0 : 320);
    }

    const box = el.getBoundingClientRect();

    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  private sizeOf(el: HTMLElement): number {
    const rect = el.getBoundingClientRect();

    return Math.max(8, Math.min(rect.width, rect.height));
  }

  private ensure(): void {
    if (this.el) {
      return;
    }

    this.trail = Array.from({ length: AgentCursor.TRAIL }, () => {
      const dot = document.createElement('div');
      dot.className = 'agent-cursor-trail';
      dot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dot);

      return dot;
    });

    const el = document.createElement('div');
    el.className = 'agent-cursor';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    this.el = el;
  }

  private scheduleIdle(): void {
    this.cancelIdle();
    this.idleTimer = window.setTimeout(() => this.hide(), AgentCursor.IDLE_MS);
  }

  private cancelIdle(): void {
    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}
