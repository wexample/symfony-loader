import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import AppChild from './AppChild';
import App from './App';
import Component from './Component';
import { stringToKebab } from '@wexample/js-helpers/Helper/String';
import { waitForElementSize } from '@wexample/js-helpers/Helper/ElementSize';
import Page from './Page';
import { RenderNodeServiceEvents } from "../Services/AbstractRenderNodeService";
import ElementListenersMixin, { type ElementListenersType } from './Mixins/ElementListenersMixin';
import InvariantViolationError from '../Errors/InvariantViolationError';
import type { AgentActionsImplementation, AgentContractInterface, AgentNodeProviderInterface } from '../Interfaces/AgentNodeInterface';
import type AgentToolInterface from '../Interfaces/AgentToolInterface';
import { EVENT_AGENT, type AgentUserEventDetail } from './AgentUserEvents';
import ErrorService from '../Services/ErrorService';
import type { RenderNodeApiType } from '../Services/ApiService';
import type { RenderNodeAssetsType } from '../Services/AssetsService';
import type { RenderNodeLiveUpdatesType } from '../Services/LiveUpdatesService';
import type { RenderNodeLocaleType } from '../Services/LocaleService';
import type { RenderNodeResponsiveType } from '../Services/ResponsiveService';

// Methods grafted at runtime by MixinsService.applyMethods(this, 'renderNode'),
// declared here so call sites keep their types.
interface RenderNode extends
  ElementListenersType,
  RenderNodeApiType,
  RenderNodeAssetsType,
  RenderNodeLiveUpdatesType,
  RenderNodeLocaleType,
  RenderNodeResponsiveType {
}

abstract class RenderNode extends AppChild implements AgentNodeProviderInterface {
  public callerPage: Page;
  public childRenderNodes: { [key: string]: RenderNode } = {};
  public components: Component[] = [];
  public contextType: string;
  public cssClassName: string;
  public el: HTMLElement;
  public elements: { [key: string]: HTMLElement } = {};
  public elHeight: number = 0;
  public elWidth: number = 0;
  public id: string;
  public isMounted: null | boolean = null;
  public parentRenderNode: RenderNode;
  public renderData: RenderDataInterface;
  public translations: { [key: string]: string } = {}
  public translationDomains: { [alias: string]: { [view: string]: string } | string } = {};
  public usages: {} = {};
  public view: string;
  public destroyed: boolean = false;
  public vars: { [key: string]: any } = {};
  private elListenerProxies: { [key: string]: { [event: string]: EventListener } } = {};

  constructor(
    public renderRequestId: string,
    app: App,
    parentRenderNode?: RenderNode
  ) {
    super(app);
    this.parentRenderNode = parentRenderNode;
  }

  public async init() {
    this.app.services.mixins.applyMethods(this, 'renderNode');
    ElementListenersMixin.apply(this);

    this.app.services.events.trigger(RenderNodeServiceEvents.CREATE_RENDER_NODE, {
      component: this,
    });

    // Layout can have no parent node.
    if (this.parentRenderNode) {
      this.parentRenderNode.appendChildRenderNode(this);
    }
  }

  public async exit() {
    for (const renderNode of this.eachChildRenderNode()) {
      await renderNode.exit();
    }

    this.destroyed = true;

    if (this.parentRenderNode) {
      this.parentRenderNode.removeChildRenderNode(this);
    }

    await this.unmounted();
  }

  loadFirstRenderData(renderData: RenderDataInterface) {
    this.renderData = renderData;

    this.mergeRenderData(renderData);
  }

  mergeRenderData(renderData: RenderDataInterface) {
    this.cssClassName = renderData.cssClassName;
    this.id = renderData.id;
    this.view = renderData.view;
    this.callerPage = renderData.requestOptions.callerPage;
    this.translationDomains = renderData.translationDomains;
    this.contextType = renderData.contextType;

    this.translations = {
      ...this.translations,
      ...renderData.translations,
    };

    this.vars = {...this.vars, ...renderData.vars};
    this.usages = {...this.usages, ...renderData.usages};
  }

  appendChildRenderNode(renderNode: RenderNode) {
    renderNode.parentRenderNode = this;
    this.childRenderNodes[renderNode.id] = renderNode;
  }

  removeChildRenderNode(renderNode: RenderNode) {
    delete this.childRenderNodes[renderNode.id];
  }

  findChildRenderNodeByView(view: string): RenderNode {
    for (let node of this.eachChildRenderNode()) {
      if (node.view === view) {
        return node;
      }
    }

    return null;
  }

  eachChildRenderNode(): RenderNode[] {
    return Object.values(this.childRenderNodes);
  }

  findChildByDomId(domId: string, recursive: boolean = false): RenderNode | null {
    for (const child of this.eachChildRenderNode()) {
      if (child.el && child.el.getAttribute('id') === domId) {
        return child;
      }

      if (recursive) {
        const found = child.findChildByDomId(domId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  attachHtmlElements() {
  }

  // Shortcut: map element keys to selectors and auto-attach.
  // Example: this.attachHtmlElementsMap({ searchInput: '[data-el="searchInput"]' });
  protected attachHtmlElementsMap(map: { [key: string]: string }): void {
    for (const [key, selector] of Object.entries(map)) {
      this.attachHtmlElement(key, selector);
    }
  }

  protected attachHtmlElement(key: string, selector: string): void {
    const el = this.el.querySelector(selector) as HTMLElement | null;
    if (!el) {
      throw new InvariantViolationError({
        message: `Missing element "${key}" using selector "${selector}" in "${this.view}".`,
        code: 'ERR_RENDER_NODE_ELEMENT_MISSING',
        context: {
          view: this.view,
          key,
          selector,
        },
      });
    }
    this.elements[key] = el;
  }

  protected onEl(
    key: string,
    event: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    const el = this.elements[key];
    if (!el) {
      throw new InvariantViolationError({
        message: `Missing element "${key}" for event "${event}" in "${this.view}".`,
        code: 'ERR_RENDER_NODE_EVENT_ELEMENT_MISSING',
        context: {
          view: this.view,
          key,
          event,
        },
      });
    }
    el.addEventListener(event, handler);
  }

  protected offEl(
    key: string,
    event: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    const el = this.elements[key];
    if (!el) {
      return;
    }
    el.removeEventListener(event, handler);
  }

  async mountOnce() {
    // When render nodes are attached to the tree,
    // the whole layout try to mount the newly created render nodes,
    // so we should prevent it to be mounted twice.
    if (this.isMounted === null) {
      await this.mount();
    }
  }

  async mount() {
    if (this.isMounted === true) {
      return;
    }

    this.isMounted = true;

    this.attachHtmlElements();
    this.updateElSize();
    await this.activateListeners();
    await this.activateTools();

    if (this.parentRenderNode) {
      this.parentRenderNode.childMounted(this);
    }

    await this.mounted();
    void this.afterVisible();
  }

  public async notifyVisible(): Promise<void> {
    void waitForElementSize(
      this.el,
      1,
      500,
      (target) => target.getClientRects().length > 0
    ).then(() => this.afterVisible());
  }

  public async notifyTreeVisible(): Promise<void> {
    await this.forEachTreeRenderNode(async (renderNode: RenderNode) => {
      await renderNode.notifyVisible();
    });
  }

  async unmount() {
    if (this.isMounted === false) {
      return;
    }

    this.isMounted = false;

    this.detachHtmlElements();

    await this.deactivateListeners();
    await this.deactivateTools();
    await this.unmounted();
  }

  async mountTree() {
    await this.forEachTreeRenderNode(async (renderNode: RenderNode) => {
      await renderNode.mountOnce();
    });
  }

  async setNewTreeRenderNodeReady() {
    await this.forEachTreeRenderNode(async (renderNode: RenderNode) => {
      if (!renderNode.isReady) {
        await renderNode.renderNodeReady();
      }
    });
  }

  detachHtmlElements() {
    this.el.remove();
    delete this.el;

    let el: HTMLElement;
    for (el of Object.values(this.elements)) {
      el.remove();
    }

    this.elements = {};
  }

  public async updateMounting() {
    if (this.el && !this.el.isConnected) {
      await this.unmount();
    } else if (!this.el && !this.destroyed) {
      await this.mount();
    }
  }

  async forEachTreeRenderNode(callback?: Function) {
    await callback(this);

    await this.forEachTreeChildRenderNode(callback);
  }

  async forEachTreeChildRenderNode(callback?: Function) {
    let renderNode: RenderNode;
    for (renderNode of this.eachChildRenderNode()) {
      await renderNode.forEachTreeRenderNode(callback);
    }
  }

  updateElSize() {
    let rect = this.el.getBoundingClientRect();

    this.elWidth = rect.width;
    this.elHeight = rect.height;
  }

  getElWidth(): number {
    return this.elWidth;
  }

  getElHeight(): number {
    return this.elHeight;
  }

  protected getElListeners(): { [key: string]: string | string[] } {
    return {};
  }

  protected async activateListeners(): Promise<void> {
    this.activateElListeners();
  }

  protected async deactivateListeners(): Promise<void> {
    this.deactivateElListeners();
  }

  // What an agent may do through this node, as long as it is mounted: none by
  // default. Read once per mount, so a tool may describe the state it finds.
  protected getAgentTools(): AgentToolInterface[] {
    return [];
  }

  // What the agent tools read of this node (AgentNodeProviderInterface):
  // nothing, by default — a component reads its contract from its `.ai.yml`,
  // and says the rest through the hooks below.
  public getAgentContract(): AgentContractInterface | null {
    return null;
  }

  // Whether this node says it is shown to an agent: all its actions (true),
  // some of them by name, nothing (false), or nothing said — undefined, the
  // default —, the node then shown when what holds it in the page is.
  public getAgentExposure(): boolean | string[] | undefined {
    return undefined;
  }

  // Makes a node it holds visible, before an agent points at it: a folded
  // container unfolds. Nothing by default.
  public async revealAgentChild(child: AgentNodeProviderInterface): Promise<void> {
  }

  // The part of the node a frame goes round: the node, unless the reader
  // sees it as one of its parts — the link of a menu entry.
  public getAgentFrameElement(): HTMLElement | null {
    return this.el ?? null;
  }

  // How the actions of the contract run, by name.
  public getAgentActions(): AgentActionsImplementation {
    return {};
  }

  // Read each time the page is inspected, so it tells what it finds.
  public getAgentState(): Record<string, any> | undefined {
    return undefined;
  }

  public getAgentLabel(): string | undefined {
    return undefined;
  }

  // Says the user did something to this node, for the agent to read at its
  // next turn (AgentUserEvents): a short sentence in english, 'Switched
  // "Theme" on'. Done again, it is counted, not written again: `key` says
  // what counts as the same — the node and the action, by default the node
  // and the sentence. What an agent does itself is not written down.
  protected logAgentEvent(summary: string, options: { key?: string; detail?: Record<string, any> } = {}): void {
    const detail: AgentUserEventDetail = {
      summary,
      kind: 'node',
      key: `${this.id}:${options.key ?? summary}`,
      node: { type: this.getAgentContract()?.type, label: this.getAgentLabel() },
      ...(options.detail ? { detail: options.detail } : {}),
    };

    (this.el ?? document).dispatchEvent(new CustomEvent(EVENT_AGENT, { bubbles: true, detail }));
  }

  // Known to the agent tools while mounted: as a node of the page, and
  // through the tools it offers of its own.
  protected async activateTools(): Promise<void> {
    const agentTools = this.app.services.agentTools;

    if (!agentTools) {
      return;
    }

    agentTools.registerNode(this);

    for (const tool of this.getAgentTools()) {
      agentTools.register(this, tool);
    }
  }

  protected async deactivateTools(): Promise<void> {
    this.app.services.agentTools?.unregisterNode(this);
    this.app.services.agentTools?.unregisterOwner(this);
  }

  protected async mounted(): Promise<void> {
    await this.app.services.mixins.invokeUntilComplete(
      'hookMounted',
      'renderNode',
      [this]
    );
  }

  protected async afterVisible(): Promise<void> {
  }

  protected async unmounted(): Promise<void> {
    if (this.parentRenderNode) {
      this.parentRenderNode.childUnmounted(this);
    }

    await this.app.services.mixins.invokeUntilComplete(
      'hookUnmounted',
      'renderNode',
      [this]
    );
  }

  public async renderNodeReady(): Promise<void> {
    await this.readyComplete();
  }

  public async trigger(eventName: string, args = {}): Promise<void> {
    args['renderNode'] = this;

    await this.app.services.events.trigger(
      eventName,
      args,
      this.el
    );
  }

  childMounted(renderNode: RenderNode) {
    // When mounting child render node,
    // it size may change or turn accessible,
    // it will be used to chose proper responsive assets.
    this.updateElSize();
  }

  protected childUnmounted(renderNode: RenderNode) {
    // To override.
  }

  async setUsage(
    usageName: string,
    usageValue: string,
    initial: boolean = false
  ) {
    if (!initial && this.app.layout.vars['usagesConfig'][usageName]['list'][usageValue]['allow_switch'] == false) {
      (this.app.getServiceOrFail(ErrorService) as ErrorService).capture(
        `Switching is not allowed for usage "${usageName}" and value "${usageValue}".`,
        {
          severity: 'warning',
          context: {
            source: 'render-node.set-usage',
            details: {
              usageName,
              usageValue,
            },
          },
        }
      );
      return;
    }

    let classList = document.body.classList;
    let usageKebab = stringToKebab(usageName)

    this.usages[usageName] = usageValue;

    classList.forEach((className: string) => {
      if (className.startsWith(`usage-${usageKebab}-`)) {
        classList.remove(className);
      }
    });

    classList.add(`usage-${usageKebab}-${usageValue}`);

    // Propagate
    this.forEachTreeChildRenderNode((renderNode: RenderNode) => {
      renderNode.setUsage(
        usageName,
        usageValue,
        initial
      )
    })
  }

  public abstract getRenderNodeType(): string;
}

export default RenderNode;
