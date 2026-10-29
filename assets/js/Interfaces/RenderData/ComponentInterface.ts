import RenderDataInterface from './RenderDataInterface';
import type { AgentContractInterface } from '../AgentNodeInterface';

export default interface ComponentInterface extends RenderDataInterface {
  id: string;
  initMode: string;
  options: any;
  renderRequestId: string;
  // Only for a component an agent is shown, and that has a contract.
  agent?: AgentContractInterface;
}
