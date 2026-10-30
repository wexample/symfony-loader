import type { AgentActionsImplementation, AgentContractInterface, AgentNodeProviderInterface } from '../Interfaces/AgentNodeInterface';

// A vue as the agent tools read it. The vue says what a render node says,
// through methods of the same names — `getAgentActions()`, `getAgentState()`,
// `getAgentLabel()`, `revealAgentChild()`, `getAgentFrameElement()` — and
// whether it is shown through its `agent` prop; its contract is the
// `.ai.yml` beside its template, handed over with the page (VueService).
export default class VueAgentNode implements AgentNodeProviderInterface {
  public readonly id: string;

  public readonly view: string;

  constructor(
    private readonly instance: any,
    view: string,
    private readonly contract: AgentContractInterface,
  ) {
    this.view = view;
    this.id = `vue-${instance.$.uid}`;
  }

  // A vue drawing several roots has no element of its own, and is not read.
  get el(): HTMLElement | null {
    return this.instance.$el instanceof HTMLElement ? this.instance.$el : null;
  }

  getRenderNodeType(): string {
    return 'vue';
  }

  getAgentContract(): AgentContractInterface | null {
    return this.contract;
  }

  getAgentExposure(): boolean | string[] | undefined {
    return this.instance.agent ?? undefined;
  }

  getAgentActions(): AgentActionsImplementation {
    return this.instance.getAgentActions?.() ?? {};
  }

  getAgentState(): Record<string, any> | undefined {
    return this.instance.getAgentState?.();
  }

  getAgentLabel(): string | undefined {
    return this.instance.getAgentLabel?.();
  }

  async revealAgentChild(child: AgentNodeProviderInterface): Promise<void> {
    await this.instance.revealAgentChild?.(child);
  }

  getAgentFrameElement(): HTMLElement | null {
    return this.instance.getAgentFrameElement?.() ?? this.el;
  }
}
