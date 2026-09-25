import Component from './Component';
import Page from './Page';
import ComponentInterface from "../Interfaces/RenderData/ComponentInterface";

export default abstract class PageManagerComponent extends Component {
  public page: Page;
  public layoutBody: string;
  public onEmbedCloseProxy: EventListener;
  public onFormLoadingStartProxy: EventListener;
  public onFormLoadingEndProxy: EventListener;
  protected isInstantTransition: boolean = false;
  private pageLoadingTimer: number | null = null;
  private onContainedClickProxy: EventListener | null = null;
  // Set by a navigation made in this manager, so the page arriving after it
  // slides in, and only that one: a modal opening has its own entrance.
  private pageTransitionDirection: 'forward' | 'back' | null = null;
  private pageTransitionTimer: number | null = null;
  private onPageNavigateProxy: EventListener | null = null;

  // Past this, a page still on its way is said to be: a fast one arrives
  // before anything would have flashed.
  protected static readonly PAGE_LOADING_DELAY_MS = 300;

  // Long enough for the arriving page to be seen settling, short enough not to
  // be waited for.
  protected static readonly PAGE_TRANSITION_MS = 200;

  mergeRenderData(renderData: ComponentInterface) {
    super.mergeRenderData(renderData);

    // This component is defined as the manager of
    // rendered page from the request.
    // Basically a modal or a panel (layout level).
    if (renderData.options.adaptiveResponsePageManager) {
      // Save component in registry allowing rendered page to append body to current component.
      this.app.services.pages.pageHandlerRegistry[this.renderRequestId] =
        this;
    }
  }

  /**
   * Used by page handlers (modal / panels).
   */
  public setLayoutBody(body: string) {
    this.layoutBody = body;
  }

  public getPageEl(): HTMLElement {
    return this.el;
  }

  /**
   * A page is being fetched for this manager: once it has taken long enough to
   * be noticed, the manager wears `is-page-loading`, which the design system
   * draws as a spinner over the room the page will fill. A manager marked
   * `data-page-loading="off"` says nothing.
   */
  public pageLoadingStart(): void {
    this.pageLoadingEnd();

    if (this.el.dataset.pageLoading === 'off') {
      return;
    }

    this.pageLoadingTimer = window.setTimeout(() => {
      this.pageLoadingTimer = null;
      this.el.classList.add('is-page-loading');
      this.el.setAttribute('aria-busy', 'true');
    }, PageManagerComponent.PAGE_LOADING_DELAY_MS);
  }

  public pageLoadingEnd(): void {
    if (this.pageLoadingTimer !== null) {
      window.clearTimeout(this.pageLoadingTimer);
      this.pageLoadingTimer = null;
    }

    this.el.classList.remove('is-page-loading');
    this.el.removeAttribute('aria-busy');
  }

  public setPage(page: Page) {
    this.page = page;
    this.pageTransitionEnter();
  }

  // The page leaving slides a few pixels the way the visitor goes and fades,
  // the one arriving slides in from the other side: only where the page asked
  // for it with `data-page-transition="slide"`, which the design system draws.
  private pageTransitionLeave(direction: 'forward' | 'back'): void {
    this.pageTransitionDirection = direction;

    if (!this.el.querySelector('[data-page-transition="slide"]')) {
      return;
    }

    this.el.classList.remove('is-page-entering--forward', 'is-page-entering--back');
    this.el.classList.add(`is-page-leaving--${direction}`);
  }

  private pageTransitionEnter(): void {
    const direction = this.pageTransitionDirection;
    this.pageTransitionDirection = null;

    // Nothing was navigated here: a first page — the layout's own, set before
    // its element is even there, or a modal opening — has nothing to undo.
    if (!direction || !this.el) {
      return;
    }

    this.el.classList.remove('is-page-leaving--forward', 'is-page-leaving--back');

    if (!this.el.querySelector('[data-page-transition="slide"]')) {
      return;
    }

    if (this.pageTransitionTimer !== null) {
      window.clearTimeout(this.pageTransitionTimer);
    }

    this.el.classList.add(`is-page-entering--${direction}`);
    this.pageTransitionTimer = window.setTimeout(() => {
      this.pageTransitionTimer = null;
      this.el.classList.remove('is-page-entering--forward', 'is-page-entering--back');
    }, PageManagerComponent.PAGE_TRANSITION_MS);
  }

  /**
   * The layout base this manager renders a page in — `modal`, `panel`,
   * `embed` — or null for one that cannot take a page from a link.
   */
  protected getLayoutBase(): string | null {
    return null;
  }

  /**
   * Whether what stands at `el` asked for its links and redirects to stay in
   * this manager. A page opts in by marking an element of its own with
   * `data-page-navigation="contained"`, and that holds for the whole manager —
   * the steps above its header and the actions at its foot included, which
   * stand outside the page's body. A link or a region marked
   * `data-page-navigation="leave"` opts out. A page that says nothing
   * navigates as it always did.
   */
  public isNavigationContained(el: Element): boolean {
    if (!this.getLayoutBase() || !this.el.contains(el)) {
      return false;
    }

    const marked = el.closest('[data-page-navigation]');

    if (marked && this.el.contains(marked)) {
      return marked.getAttribute('data-page-navigation') === 'contained';
    }

    return this.el.querySelector('[data-page-navigation="contained"]') !== null;
  }

  /**
   * Loads the page at `url` into this manager rather than into the window or a
   * new one: the next step of a tunnel opened in a modal comes in the modal.
   */
  public navigateContained(url: string, direction: 'forward' | 'back' = 'forward'): Promise<any> {
    const base = this.getLayoutBase();
    const target = new URL(url, window.location.href);

    if (base && !target.searchParams.has('__layout')) {
      target.searchParams.set('__layout', base);
    }

    this.pageLoadingStart();
    this.pageTransitionLeave(direction);

    const request = Promise.resolve(
      this.app.services.adaptive.get(target.pathname + target.search, {
        destPage: this,
        instant: true,
      })
    );

    request.then(() => this.pageLoadingEnd(), () => this.pageLoadingEnd());

    return request;
  }

  // A plain left click on a link of this site, the page having asked for it:
  // anything else — a new tab, a download, an anchor, another site — is left
  // to the browser.
  private onContainedClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;

    if (!link || !this.isNavigationContained(link)) {
      return;
    }

    const href = link.getAttribute('href') ?? '';

    if (href.startsWith('#') || link.target || link.hasAttribute('download') || link.origin !== window.location.origin) {
      return;
    }

    event.preventDefault();
    // A link going back — previous — says so, and the page slides the other way.
    void this.navigateContained(link.href, link.dataset.pageDirection === 'back' ? 'back' : 'forward');
  }

  // What a form of the page announces instead of leaving: a redirect (`url`)
  // or a page it already received (`renderData`). Taken only where the page
  // asked for it; elsewhere the form does what it always did.
  private onPageNavigate(event: CustomEvent): void {
    const source = event.target as Element | null;

    if (event.defaultPrevented || !source || !this.isNavigationContained(source)) {
      return;
    }

    event.preventDefault();

    if (event.detail?.renderData) {
      this.pageTransitionLeave('forward');
      void this.app.services.adaptive.handleRenderData(event.detail.renderData, {
        destPage: this,
        instant: true,
      });
    } else if (event.detail?.url) {
      void this.navigateContained(event.detail.url);
    }
  }

  protected async activateListeners(): Promise<void> {
    await super.activateListeners();

    this.onEmbedCloseProxy = this.onEmbedClose.bind(this) as EventListener;
    this.el.addEventListener('embed:close', this.onEmbedCloseProxy);

    this.onContainedClickProxy = this.onContainedClick.bind(this) as EventListener;
    this.onPageNavigateProxy = this.onPageNavigate.bind(this) as EventListener;
    this.el.addEventListener('click', this.onContainedClickProxy);
    this.el.addEventListener('page:navigate', this.onPageNavigateProxy);

    this.onFormLoadingStartProxy = this.onFormLoadingStart.bind(this) as EventListener;
    this.onFormLoadingEndProxy = this.onFormLoadingEnd.bind(this) as EventListener;
    this.el.addEventListener('loading:start', this.onFormLoadingStartProxy);
    this.el.addEventListener('loading:end', this.onFormLoadingEndProxy);
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.onEmbedCloseProxy) {
      this.el.removeEventListener('embed:close', this.onEmbedCloseProxy);
    }

    if (this.onFormLoadingStartProxy) {
      this.el.removeEventListener('loading:start', this.onFormLoadingStartProxy);
    }
    if (this.onFormLoadingEndProxy) {
      this.el.removeEventListener('loading:end', this.onFormLoadingEndProxy);
    }
    if (this.onContainedClickProxy) {
      this.el.removeEventListener('click', this.onContainedClickProxy);
    }
    if (this.onPageNavigateProxy) {
      this.el.removeEventListener('page:navigate', this.onPageNavigateProxy);
    }
  }

  protected async onEmbedClose(event: CustomEvent) {
    const source = event.detail?.source;
    if (!source || !source.el || !this.el.contains(source.el)) {
      return;
    }

    const instant = !!event.detail?.instant;
    if (instant) {
      this.setInstantTransition(true);
    }

    await this.close();

    if (instant) {
      this.setInstantTransition(false);
    }
  }

  protected onFormLoadingStart(event: CustomEvent) {
    const source = event.detail?.source;
    if (!source || !source.el || !this.el.contains(source.el)) {
      return;
    }

    this.el.classList.remove('is-loaded');
    this.el.classList.add('is-loading');
  }

  protected onFormLoadingEnd(event: CustomEvent) {
    const source = event.detail?.source;
    if (!source || !source.el || !this.el.contains(source.el)) {
      return;
    }

    this.el.classList.remove('is-loading');
    this.el.classList.add('is-loaded');

    window.setTimeout(() => {
      this.el.classList.remove('is-loaded');
    }, 320);
  }

  public async open(_options: { instant?: boolean } = {}): Promise<void> {
    // To override if needed.
  }

  public async close(_options: { instant?: boolean } = {}): Promise<void> {
    // To override if needed.
  }

  protected setInstantTransition(instant: boolean) {
    this.isInstantTransition = instant;
    if (!this.el) {
      return;
    }

    if (instant) {
      this.el.classList.add('is-instant');
    } else {
      this.el.classList.remove('is-instant');
    }
  }
}
