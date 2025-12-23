import Component from './Component';
import Page from './Page';
import ComponentInterface from "../interfaces/RenderData/ComponentInterface";

export default abstract class PageManagerComponent extends Component {
  public page: Page;

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

  public setLayoutBody(body: string) {
    this.el.innerHTML = body;
  }

  public getPageEl(): HTMLElement {
    return this.el;
  }

  public setPage(page: Page) {
    this.page = page;
  }
}
