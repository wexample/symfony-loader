import AppChild from '../AppChild';
import RenderNode from '../RenderNode';
import DebugService from '../../Services/DebugService';
import VueService from '../../Services/VueService';
import DebugRenderNodeInfo from './DebugRenderNodeInfo';
import DebugRenderNodeOverlay from './DebugRenderNodeOverlay';
import { DOM_ATTRIBUTE, DOM_TAG_NAME } from '@wexample/js-helpers/Helper/Dom';

export default class DebugRenderNode extends AppChild {
  public borderColors: any = {
    component: 'yellow',
    page: 'blue',
    layout: 'red',
  };
  public el: HTMLElement;
  public renderNode: RenderNode;
  public service: DebugService;
  protected renderNodeDebugOverlay = DebugRenderNodeOverlay;
  public vueInfo: any;
  public updateProxy: Function;

  constructor(renderNode) {
    super(renderNode.app);

    this.renderNode = renderNode;
    this.service = this.app.services.debug as DebugService;

    this.createEl();

    let vueService = this.app.services.vue as VueService;
    this.vueInfo = vueService
      .createApp(DebugRenderNodeInfo, {
        app: this.app,
        renderNode: renderNode,
        debugRenderNode: this,
      })
      .mount(this.el);

    this.addTrackers();

    this.updateProxy = this.update.bind(this);

    // After app loaded.
    renderNode.ready(() => {
      this.service.debugRenderNodes[this.renderNode.id] = this;

      // Wait rendering complete.
      setTimeout(this.updateProxy, 200);
    });
  }

  addTrackers() {
    let methods = Object.entries(this.renderNodeDebugOverlay);

    methods.forEach((data) => {
      let name: string = data[0];
      let methodReplacementGenerator = data[1];

      if (typeof methodReplacementGenerator === 'function') {
        this.renderNode[name] = methodReplacementGenerator(
          this.renderNode[name],
          this.renderNode,
          this
        );
      }
    });
  }

  blur() {
    this.el.classList.remove('focus');
  }

  focus() {
    this.el.classList.add('focus');
  }

  convertPosition(number) {
    return `${number}px`;
  }

  createEl() {
    this.el = document.createElement(DOM_TAG_NAME.DIV);
    this.el.classList.add('debug-render-node');
    this.el.style.borderColor = this.getBorderColor();

    this.service.elDebugHelpers.appendChild(this.el);

    this.renderNode.ready(() => {
      this.el.setAttribute(DOM_ATTRIBUTE.ID, `debug-${this.renderNode.id}`);
    });
  }

  update() {
    this.vueInfo.$forceUpdate();

    // TODO if out of screen el may not be visible, we should wait for element to appear / be attached.
    if (this.renderNode.el) {
      let rect = this.renderNode.el.getBoundingClientRect();

      Object.assign(this.el.style, {
        top: this.convertPosition(rect.top),
        left: this.convertPosition(rect.left),
        width: this.convertPosition(rect.width),
        height: this.convertPosition(rect.height),
      });
    }
  }

  getBorderColor(): string {
    return this.borderColors[this.renderNode.getRenderNodeType()];
  }
}
