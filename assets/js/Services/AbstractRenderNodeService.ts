import AppService from '../Class/AppService';
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import RenderNode from '../Class/RenderNode';
import ServicesRegistryInterface from '../Interfaces/ServicesRegistryInterface';
import { stringToKebab } from '@wexample/js-helpers/Helper/String';

export class RenderNodeServiceEvents {
  public static CREATE_RENDER_NODE: string = 'create-render-node';
  public static USAGE_UPDATED: string = 'usage-changed';
}

export default abstract class AbstractRenderNodeService extends AppService {
  public services: ServicesRegistryInterface;

  /**
   * Prepare raw data object, for example make assets definition unique across
   * the several render nodes (one single css file for every rendered node).
   */
  public async prepareRenderData(renderData: RenderDataInterface): Promise<any> {
    renderData.requestOptions = renderData.requestOptions || {};

    const response = await this.app.services.mixins.invokeUntilComplete(
      'hookPrepareRenderData',
      'app',
      [renderData]
    );

    // Do not deep freeze as sub-parts might be prepared later.
    Object.seal(renderData);

    return response;
  }

  async createRenderNode(
    renderRequestId: string,
    view: string,
    renderData: RenderDataInterface,
    parentRenderNode?: RenderNode
  ): Promise<null | RenderNode> {
    await this.prepareRenderData(renderData);

    await this.app.services.mixins.invokeUntilComplete(
      'hookBeforeCreate',
      'renderNode',
      [view, renderData, parentRenderNode]
    );

    let classDefinition = this.app.getBundleClassDefinition(
      view,
      true
    );

    const instance: null | RenderNode = this.createRenderNodeInstance(
      renderRequestId,
      classDefinition,
      parentRenderNode,
      view,
    );

    if (instance) {
      instance.loadFirstRenderData(renderData);

      await instance.init();
    }

    return instance;
  }

  async createComponentFromTemplate(
    view: string,
    options: any,
    parentRenderNode: RenderNode,
    mountTarget?: HTMLElement
  ): Promise<null | { instance: RenderNode, el: HTMLElement }> {
    const template = document.querySelector(
      `template[data-component-template="${view}"]`
    ) as HTMLTemplateElement;

    if (!template) {
      this.app.services.prompt.systemError(
        `Component template not found for "${view}"`
      );
      return null;
    }

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const rootEl = fragment.firstElementChild as HTMLElement;
    if (!rootEl) {
      this.app.services.prompt.systemError(
        `Component template "${view}" is empty`
      );
      return null;
    }

    const uniqueId = `component-${stringToKebab(view)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cssClassName = stringToKebab(uniqueId);
    rootEl.setAttribute('data-component-instance', cssClassName);

    (mountTarget || parentRenderNode.el).appendChild(rootEl);

    const renderData: RenderDataInterface = {
      components: [],
      cssClassName,
      contextType: 'component',
      id: uniqueId,
      translations: {},
      translationDomains: {},
      view,
      vars: {},
      usages: parentRenderNode.usages || {},
      assets: {
        css: [],
        js: []
      },
      initMode: 'template',
      options: options || {},
      requestOptions: parentRenderNode.renderData?.requestOptions || {}
    } as RenderDataInterface;

    const instance = await this.createRenderNode(
      parentRenderNode.renderRequestId,
      view,
      renderData,
      parentRenderNode
    );
    if (!instance) {
      return null;
    }

    return {
      instance,
      el: rootEl
    };
  }

  createRenderNodeInstance(
    renderRequestId: string,
    classDefinition: any,
    parentRenderNode: RenderNode,
    view: string,
  ): RenderNode | null {
    try {
      return new classDefinition(renderRequestId, this.app, parentRenderNode);
    } catch {
      this.app.services.prompt.systemError(
        `Unable to find component with name "${classDefinition ? classDefinition.toString() : view}"`
      );
    }
  }
}
