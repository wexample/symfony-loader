// Script par of a Vue component.
import RenderNode from '../RenderNode';
import RenderDataInterface from '../../interfaces/RenderData/RenderDataInterface';
import DebugRenderNode from './DebugRenderNode';
import { EventsServiceEvents } from '../../services/EventsService';

// Used to be mixed with render node and track changes.
export default {
  init: function (
    methodOriginal: Function,
    renderNode: RenderNode,
    debugRenderNode: DebugRenderNode
  ) {
    return function () {
      this.app.services.events.listen(
        EventsServiceEvents.DISPLAY_CHANGED,
        debugRenderNode.updateProxy
      );

      methodOriginal.apply(renderNode, arguments);
    };
  },

  exit: function (
    methodOriginal: Function,
    renderNode: RenderNode,
    debugRenderNode: DebugRenderNode
  ) {
    return function () {
      debugRenderNode.el.remove();

      this.app.services.events.forget(
        EventsServiceEvents.DISPLAY_CHANGED,
        debugRenderNode.updateProxy
      );

      methodOriginal.apply(renderNode, arguments);
    };
  },

  loadRenderData(
    methodOriginal: Function,
    renderNode: RenderNode,
    debugRenderNode: DebugRenderNode
  ) {
    return function (renderData: RenderDataInterface) {
      debugRenderNode.vueInfo.$.props.renderData = renderData;

      return methodOriginal.apply(renderNode, arguments);
    };
  },
};
