import ComponentInterface from '../Interfaces/RenderData/ComponentInterface';
import RenderNode from './RenderNode';
import { domFindPreviousNode } from '@wexample/js-helpers/Helper/Dom';
import InvariantViolationError from '../Errors/InvariantViolationError';

export default abstract class Component extends RenderNode {
  protected initMode: string;
  public options: any = {};

  public static INIT_MODE_CLASS: string = 'class';

  public static INIT_MODE_LAYOUT: string = 'layout';

  public static INIT_MODE_PARENT: string = 'parent';

  public static INIT_MODE_PREVIOUS: string = 'previous';
  public static INIT_MODE_TEMPLATE: string = 'template';

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
    let elPlaceholder: HTMLElement | null = null;
    let removePlaceHolder = true;

    if (this.initMode !== Component.INIT_MODE_TEMPLATE) {
      elPlaceholder = this.parentRenderNode.el.querySelector(
        `.${this.cssClassName}`
      ) as HTMLElement;

      if (!elPlaceholder) {
        throw new InvariantViolationError({
          message: `Component placeholder missing for "${this.view}" using ".${this.cssClassName}".`,
          code: 'ERR_COMPONENT_PLACEHOLDER_MISSING',
          context: {
            view: this.view,
            cssClassName: this.cssClassName,
          },
        });
      }
    }

    switch (this.initMode) {
      case Component.INIT_MODE_CLASS:
        el = elPlaceholder;
        removePlaceHolder = false;
        break;
      case Component.INIT_MODE_TEMPLATE:
        el = this.parentRenderNode?.el?.querySelector(
          `[data-component-instance="${this.cssClassName}"]`
        ) as HTMLElement;
        if (!el) {
          el = document.querySelector(
            `[data-component-instance="${this.cssClassName}"]`
          ) as HTMLElement;
        }
        removePlaceHolder = false;
        break;
      case Component.INIT_MODE_PARENT:
        el = elPlaceholder.parentElement;
        break;
      case Component.INIT_MODE_LAYOUT:
      case Component.INIT_MODE_PREVIOUS:
        el = domFindPreviousNode(elPlaceholder);
        break;
    }

    if (removePlaceHolder) {
      // Remove placeholder tag as it may interact with CSS or JS selectors.
      elPlaceholder.remove();
    }

    if (!el) {
      throw new InvariantViolationError({
        message: `Unable to find element "${this.view}" using "${this.initMode}" init mode.`,
        code: 'ERR_COMPONENT_ELEMENT_NOT_FOUND',
        context: {
          view: this.view,
          initMode: this.initMode,
          cssClassName: this.cssClassName,
        },
      });
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
