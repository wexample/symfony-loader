import type { AgentContractInterface } from '../AgentNodeInterface';
import RenderDataInterface from './RenderDataInterface';
import PageInterface from './PageInterface';

export default interface LayoutInterface extends RenderDataInterface {
  body?: null | string;
  templates: string;
  env: string;
  page: PageInterface;
  vueTemplates?: string[];
  // By view, what an agent is told of the vues drawn from it.
  vueContracts?: Record<string, AgentContractInterface>;
  // What the page's agent tools may offer, as the application configures it
  // (symfony-ai adds it to the layout's render data).
  agentTools?: { enabled?: boolean; disabled?: string[] };
}
