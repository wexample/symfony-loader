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
