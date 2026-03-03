import AppService from '../Class/AppService';
import PromptService from './PromptsService';
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import RenderNode from '../Class/RenderNode';
import ServicesRegistryInterface from '../Interfaces/ServicesRegistryInterface';
import TemplateInstanceFactory from '../Utils/TemplateInstanceFactory';

export class RenderNodeServiceEvents {
  public static CREATE_RENDER_NODE: string = 'create-render-node';
  public static USAGE_UPDATED: string = 'usage-changed';
}

export default abstract class AbstractRenderNodeService extends AppService {
  public static dependencies: typeof AppService[] = [PromptService];
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
    const templateInstance = TemplateInstanceFactory.create(
      this.app,
      view,
      options,
      parentRenderNode,
      mountTarget
    );
    if (!templateInstance) {
      return null;
    }

    const instance = await this.createRenderNode(
      parentRenderNode.renderRequestId,
      view,
      templateInstance.renderData,
      parentRenderNode
    );
    if (!instance) {
      return null;
    }

    await instance.mountOnce();
    await instance.renderNodeReady();

    return {
      instance,
      el: templateInstance.rootEl
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
      this.app.services.prompt.error(
        `Unable to find component with name "${classDefinition ? classDefinition.toString() : view}"`
      );
    }
  }
}
