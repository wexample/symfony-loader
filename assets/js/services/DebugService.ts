import AppService from '../class/AppService';
import RenderNode from '../class/RenderNode';
import AbstractRenderNodeService from './AbstractRenderNodeService';
import Variables from '../helpers/Variables';
import DebugRenderNode from '../class/Debug/DebugRenderNode';
import { TagName } from '../helpers/DomHelper';
import Events from '../helpers/Events';

export default class DebugService extends AppService {
  public debugRenderNodes: any = {};
  public elDebugHelpers: HTMLElement;
  public elDebugHelpersGlobal: HTMLElement;

  public static dependencies: typeof AppService[] = [];

  public static serviceName: string = 'debug';

  registerHooks() {
    return {
      app: {
        async hookLoadLayoutRenderData() {
          this.app.services.debug.init();
        },
      },
    };
  }

  init() {
    this.createEl();
    this.addTrackers();

    window.addEventListener(Events.RESIZE, () => this.update());
    window.addEventListener(Events.SCROLL, () => this.update(), true);
  }

  createEl() {
    this.elDebugHelpers = document.createElement(TagName.DIV);
    this.elDebugHelpers.setAttribute(Variables.ID, 'layout-debug-helpers');

    this.elDebugHelpersGlobal = document.createElement(TagName.DIV);
    this.elDebugHelpers.appendChild(this.elDebugHelpersGlobal);

    this.app.layout.el.appendChild(this.elDebugHelpers);
  }

  addTrackers() {
    this.addTrackersToRenderNodeService(this.app.services.components);
    this.addTrackersToRenderNodeService(this.app.services.pages);
  }

  addTrackersToRenderNodeService(renderNodeService: AbstractRenderNodeService) {
    let debugService = this;
    let methodOriginal = renderNodeService.createRenderNodeInstance;

    renderNodeService.createRenderNodeInstance =
      function (): RenderNode | null {
        let instance = methodOriginal.apply(renderNodeService, arguments);

        debugService.initRenderNode(instance);

        return instance;
      };
  }

  initRenderNode(renderNode: RenderNode) {
    new DebugRenderNode(renderNode);
  }

  update() {
    Object.values(this.debugRenderNodes).forEach(
      (debugRenderNode: DebugRenderNode) => {
        debugRenderNode.update();
      }
    );
  }
}
