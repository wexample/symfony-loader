import AppService from '../class/AppService';
import RenderDataInterface from '../interfaces/RenderData/RenderDataInterface';
import RenderNode from '../class/RenderNode';
import ServicesRegistryInterface from '../interfaces/ServicesRegistryInterface';

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
      parentRenderNode
    );

    if (instance) {
      instance.loadFirstRenderData(renderData);

      await instance.init();
    }

    return instance;
  }

  createRenderNodeInstance(
    renderRequestId: string,
    classDefinition: any,
    parentRenderNode: RenderNode
  ): RenderNode | null {
    try {
      return new classDefinition(renderRequestId, this.app, parentRenderNode);
    } catch {
      this.app.services.prompt.systemError(
        'Unable to find component with name ":name"',
        {
          ":name": classDefinition ? classDefinition.toString() : classDefinition
        }
      );

      return null;
    }
  }
}
