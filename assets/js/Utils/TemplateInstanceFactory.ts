import { stringToKebab } from '@wexample/js-helpers/Helper/String';
import { buildUniqueId } from '@wexample/js-helpers/Helper/Id';
import RenderNode from '../Class/RenderNode';
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import RenderDataFactory from './RenderDataFactory';
import App from '../Class/App';
import ErrorService from '../Services/ErrorService';

type TemplateInstanceResult = {
  renderData: RenderDataInterface;
  rootEl: HTMLElement;
};

export default class TemplateInstanceFactory {
  static create(
    app: App,
    view: string,
    options: any,
    parentRenderNode: RenderNode,
    mountTarget?: HTMLElement
  ): TemplateInstanceResult | null {
    const template = this.findTemplate(view);
    if (!template) {
      (app.getServiceOrFail(ErrorService) as ErrorService).capture(
        `Component template not found for "${view}".`,
        {
          severity: 'error',
          context: {
            source: 'template-instance-factory.create',
            details: {
              view,
            },
          },
        }
      );
      return null;
    }

    // From here on, the component is named the way the server found it: the
    // class registry is keyed by that name too, and looking a class up under
    // the shorter one the caller wrote would find nothing.
    view = template.dataset.componentTemplate || view;

    const rootEl = this.findTemplateRoot(view, template, app);
    if (!rootEl) {
      return null;
    }

    const uniqueId = buildUniqueId(`component-${stringToKebab(view)}`);
    const cssClassName = stringToKebab(uniqueId);
    rootEl.setAttribute('data-component-instance', cssClassName);

    (mountTarget || parentRenderNode.el).appendChild(rootEl);

    const renderData = RenderDataFactory.buildComponent({
      view,
      id: uniqueId,
      cssClassName,
      initMode: 'template',
      options: options || {},
      parentRenderNode
    });

    return {
      renderData,
      rootEl
    };
  }

  private static findTemplate(view: string): HTMLTemplateElement | null {
    return (
      this.queryTemplate(view) ??
      // A component may be a file or a directory holding every renderer of the
      // same name, and whoever asks for one names it without saying which:
      // `components/toast` is where the caller points, `components/toast/toast`
      // is where the server found it. The php side settles the same two shapes
      // in ComponentPathHelper, and this is its counterpart.
      this.queryTemplate(`${view}/${view.split('/').pop()}`)
    );
  }

  private static queryTemplate(view: string): HTMLTemplateElement | null {
    return document.querySelector(
      `template[data-component-template="${view}"]`
    ) as HTMLTemplateElement | null;
  }

  private static findTemplateRoot(
    view: string,
    template: HTMLTemplateElement,
    app: App
  ): HTMLElement | null {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const rootEl = fragment.firstElementChild as HTMLElement;
    if (!rootEl) {
      (app.getServiceOrFail(ErrorService) as ErrorService).capture(
        `Component template "${view}" is empty.`,
        {
          severity: 'error',
          context: {
            source: 'template-instance-factory.find-root',
            details: {
              view,
            },
          },
        }
      );
      return null;
    }

    return rootEl;
  }
}
