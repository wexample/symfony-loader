// What an agent action returns when it leaves the page: how it leaves — an
// address to go to, or a press that will (a form submitted) —, and what to
// tell the agent once there. The page that ran it is about to be replaced, so
// the answer is not sent from it — it waits in the tab, and the conversation
// sends it from the page reached (AgentToolsService.hold()), so that the
// agent's next call finds a page listening.
export default class AgentNavigation {
  constructor(
    private readonly target: string | (() => void),
    public readonly value: Record<string, any> = {},
  ) {
  }

  go(): void {
    if (typeof this.target === 'string') {
      window.location.assign(this.target);
    } else {
      this.target();
    }
  }
}
