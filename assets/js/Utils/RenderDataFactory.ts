import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import RenderNode from '../Class/RenderNode';

type BuildComponentOptions = {
  view: string;
  id: string;
  cssClassName: string;
  initMode: string;
  options: any;
  parentRenderNode: RenderNode;
};

export default class RenderDataFactory {
  static buildComponent(params: BuildComponentOptions): RenderDataInterface {
    const {
      view,
      id,
      cssClassName,
      initMode,
      options,
      parentRenderNode
    } = params;

    return {
      components: [],
      cssClassName,
      contextType: 'component',
      id,
      translations: {},
      translationDomains: {},
      view,
      vars: {},
      usages: parentRenderNode.usages || {},
      assets: {
        css: [],
        js: []
      },
      initMode,
      options,
      requestOptions: parentRenderNode.renderData?.requestOptions || {}
    } as RenderDataInterface;
  }
}
