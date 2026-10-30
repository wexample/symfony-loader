// The outlines an agent draws round what it points at or presses, drawn in a
// layer of their own over the page rather than on the elements: an outline
// worn by an element is cut by the first of its ancestors that hides its
// overflow — a side menu, a panel, a table —, and one drawn here never is.
//
// One layer per layer of the page: the page's own, under the veil an overlay
// draws, and one in each overlay — a modal, a panel — for what stands in
// it, so that a frame belongs to the layer it was drawn on, dimmed with the
// page when a panel opens over it, and above the panel when drawn in it.
// Whose layer an element is on is asked of `hostOf`: the overlay's element
// holding it, or nothing for the page.
//
// A frame follows its element through scrolling, resizing and the element's
// own changes of size. It stands round the part of the element that can be
// seen: an element scrolled out of its container has no frame floating over
// the page. Its look is the design system's (`.agent-frame`).
export default class AgentFrameLayer {
  private readonly frames = new Map<HTMLElement, { frame: HTMLElement; root: HTMLElement; count: number }>();

  private readonly roots = new Map<HTMLElement, HTMLElement>();

  private request: number = 0;

  private resizeObserver: ResizeObserver | null = null;

  constructor(private readonly hostOfElement: (el: HTMLElement) => HTMLElement | null = () => null) {
  }

  // The layer of the page an element stands on: an overlay's element, or the
  // body for the page itself.
  hostOf(el: Element | null | undefined): HTMLElement {
    return (el instanceof HTMLElement ? this.hostOfElement(el) : null) ?? document.body;
  }

  // Said twice — pointed at, then pressed —, an element keeps its frame until
  // both are taken back.
  show(el: HTMLElement | null | undefined): void {
    if (!el) {
      return;
    }

    const entry = this.frames.get(el);

    if (entry) {
      entry.count++;
      return;
    }

    const root = this.ensureRoot(this.hostOf(el));
    const frame = document.createElement('div');
    frame.className = 'agent-frame';
    root.appendChild(frame);
    this.frames.set(el, { frame, root, count: 1 });
    this.resizeObserver?.observe(el);

    if (this.frames.size === 1) {
      this.listen();
    }

    this.place();
  }

  hide(el: HTMLElement | null | undefined): void {
    const entry = el ? this.frames.get(el) : undefined;

    if (!entry || --entry.count > 0) {
      return;
    }

    entry.frame.remove();
    this.frames.delete(el);
    this.resizeObserver?.unobserve(el);

    if (!this.frames.size) {
      this.unlisten();
    }
  }

  // The layer of a host, made the first time it is needed — and again once
  // the host it stood in is gone, a panel closed and opened anew.
  private ensureRoot(host: HTMLElement): HTMLElement {
    let root = this.roots.get(host);

    if (!root || !root.isConnected) {
      root = document.createElement('div');
      root.className = host === document.body ? 'agent-frame-layer' : 'agent-frame-layer agent-frame-layer--inner';
      root.setAttribute('aria-hidden', 'true');
      host.appendChild(root);
      this.roots.set(host, root);
    }

    return root;
  }

  private schedule = (): void => {
    cancelAnimationFrame(this.request);
    this.request = requestAnimationFrame(() => this.place());
  };

  private listen(): void {
    window.addEventListener('scroll', this.schedule, { capture: true, passive: true });
    window.addEventListener('resize', this.schedule);
    this.resizeObserver = new ResizeObserver(this.schedule);
    this.frames.forEach((entry, el) => this.resizeObserver.observe(el));
  }

  private unlisten(): void {
    cancelAnimationFrame(this.request);
    window.removeEventListener('scroll', this.schedule, { capture: true });
    window.removeEventListener('resize', this.schedule);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  // Each frame placed from its own layer's origin: the page's layer covers
  // the window, an overlay's stands at the overlay's corner and moves with it.
  private place(): void {
    const origins = new Map<HTMLElement, DOMRect>();

    this.frames.forEach(({ frame, root }, el) => {
      const rect = el.isConnected && root.isConnected ? this.visibleRect(el) : null;

      frame.hidden = !rect;

      if (rect) {
        let origin = origins.get(root);

        if (!origin) {
          origin = root.getBoundingClientRect();
          origins.set(root, origin);
        }

        Object.assign(frame.style, {
          top: `${rect.top - origin.top}px`,
          left: `${rect.left - origin.left}px`,
          width: `${rect.right - rect.left}px`,
          height: `${rect.bottom - rect.top}px`,
        });

        // The element's own corners, for the stylesheet to round the frame
        // at least as much — a pill keeps its round —; corners of several
        // values are left to the stylesheet's norm.
        const radius = getComputedStyle(el).borderRadius;
        frame.style.setProperty('--agent-frame-element-radius', /^[\d.]+px$/.test(radius) ? radius : '0px');
      }
    });
  }

  // The element's box, cut by every ancestor clipping what it holds and by
  // the window: null when nothing of it can be seen.
  private visibleRect(el: HTMLElement): { top: number; left: number; right: number; bottom: number } | null {
    const box = el.getBoundingClientRect();
    let { top, left, right, bottom } = box;

    for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);

      if (style.overflowX === 'visible' && style.overflowY === 'visible') {
        continue;
      }

      const clip = ancestor.getBoundingClientRect();
      top = Math.max(top, clip.top);
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
      bottom = Math.min(bottom, clip.bottom);
    }

    top = Math.max(top, 0);
    left = Math.max(left, 0);
    right = Math.min(right, window.innerWidth);
    bottom = Math.min(bottom, window.innerHeight);

    return right > left && bottom > top ? { top, left, right, bottom } : null;
  }
}
