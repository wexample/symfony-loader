import Component from './Component';
import Page from './Page';
import ComponentInterface from "../Interfaces/RenderData/ComponentInterface";

export default abstract class PageManagerComponent extends Component {
  public page: Page;
  public layoutBody: string;
  public onEmbedCloseProxy: EventListener;
  protected isInstantTransition: boolean = false;

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

  public setPage(page: Page) {
    this.page = page;
  }

  protected async activateListeners(): Promise<void> {
    await super.activateListeners();

    this.onEmbedCloseProxy = this.onEmbedClose.bind(this) as EventListener;
    this.el.addEventListener('embed:close', this.onEmbedCloseProxy);
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.onEmbedCloseProxy) {
      this.el.removeEventListener('embed:close', this.onEmbedCloseProxy);
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
