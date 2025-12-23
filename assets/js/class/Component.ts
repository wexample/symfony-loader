import ComponentInterface from '../interfaces/RenderData/ComponentInterface';
import RenderNode from './RenderNode';
import { findPreviousNode as DomFindPreviousNode } from '../helpers/DomHelper';

export default abstract class Component extends RenderNode {
  protected initMode: string;
  public options: any = {};

  public static INIT_MODE_CLASS: string = 'class';

  public static INIT_MODE_LAYOUT: string = 'layout';

  public static INIT_MODE_PARENT: string = 'parent';

  public static INIT_MODE_PREVIOUS: string = 'previous';

  public async init() {
    await super.init();

    await this.app.services.mixins.invokeUntilComplete(
      'hookInitComponent',
      'component',
      [this]
    );
  }

  attachHtmlElements() {
    let el: HTMLElement;

    let elPlaceholder = this.parentRenderNode.el.querySelector(
      `.${this.cssClassName}`
    ) as HTMLElement;
    let removePlaceHolder = true;

    if (!elPlaceholder) {
      this.app.services.prompt.systemError(
        'Placeholder missing for component ":name" using CSS selector .:selector',
        {
          ':name': this.view,
          ':selector': this.cssClassName
        },
        this,
        true
      );
    }

    switch (this.initMode) {
      case Component.INIT_MODE_CLASS:
        el = elPlaceholder;
        removePlaceHolder = false;
        break;
      case Component.INIT_MODE_PARENT:
        el = elPlaceholder.parentElement;
        break;
      case Component.INIT_MODE_LAYOUT:
      case Component.INIT_MODE_PREVIOUS:
        el = DomFindPreviousNode(elPlaceholder);
        break;
    }

    if (removePlaceHolder) {
      // Remove placeholder tag as it may interact with CSS or JS selectors.
      elPlaceholder.remove();
    }

    if (!el) {
      this.app.services.prompt.systemError(
        'Unable to find element ":name" using ":init_mode" init mode',
        {
          ':name': this.view,
          ':init_mode': this.initMode
        },
        this
      );
    }

    this.el = el;
  }

  public async exit() {
    await super.exit();

    await this.deactivateListeners();

    this.el.remove();
  }

  mergeRenderData(renderData: ComponentInterface) {
    super.mergeRenderData(renderData);

    this.initMode = renderData.initMode;
    this.options = {...this.options, ...renderData.options};
  }

  public getRenderNodeType(): string {
    return 'component';
  }
}
