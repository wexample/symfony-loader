import RenderDataPageInterface from '../interfaces/RenderData/PageInterface';
import RenderNode from './RenderNode';
import PageManagerComponent from './PageManagerComponent';
import ServicesRegistryInterface from '../interfaces/ServicesRegistryInterface';
import { buildStringIdentifier } from "../helpers/StringHelper";
import AppService from "./AppService";

export default class extends RenderNode {
  public isInitialPage: boolean;
  public parentRenderNode: PageManagerComponent;
  public renderData: RenderDataPageInterface;
  public services: ServicesRegistryInterface;

  public getRenderNodeType(): string {
    return 'page';
  }

  getPageLevelServices(): typeof AppService[] {
    return [];
  }

  attachHtmlElements() {
    let el: HTMLElement;

    if (this.renderData.isInitialPage) {
      el = this.app.layout.el;
    } else if (this.parentRenderNode instanceof PageManagerComponent) {
      el = this.parentRenderNode.getPageEl();
    }

    if (el) {
      this.el = el;
    } else {
      this.app.services.prompt.systemError('Unable to find DOM HTMLElement for page');
    }

    this.el.classList.add(`page-${buildStringIdentifier(this.view)}`);
  }

  mergeRenderData(renderData: RenderDataPageInterface) {
    super.mergeRenderData(renderData);

    this.isInitialPage = renderData.isInitialPage;

    if (this.isInitialPage) {
      this.app.layout.page = this;
    }
  }

  public async init() {
    await super.init();

    await this.app.loadAndInitServices(this.getPageLevelServices());

    // The initial layout is a page manager component.
    if (this.parentRenderNode instanceof PageManagerComponent) {
      this.parentRenderNode.setPage(this);
    }

    await this.app.services.mixins.invokeUntilComplete(
      'hookInitPage',
      'page',
      [
        this,
      ]
    );

    if (!this.app.layout.pageFocused) {
      this.focus();
    }
  }

  public async renderNodeReady(): Promise<void> {
    await super.renderNodeReady();

    await this.pageReady();
  }

  public focus() {
    this.activateFocusListeners();

    this.app.layout.pageFocused && this.app.layout.pageFocused.blur();
    this.app.layout.pageFocused = this;
  }

  public blur() {
    this.deactivateFocusListeners();
  }

  protected activateFocusListeners(): void {
    // To override.
  }

  protected deactivateFocusListeners(): void {
    // To override.
  }

  getElWidth(): number {
    // Initial page uses layout width for responsiveness calculation.
    return this.isInitialPage
      ? this.app.layout.getElWidth()
      : super.getElWidth();
  }

  pageReady() {
    // To override.
  }
}
