import RenderDataInterface from './RenderDataInterface';

export default interface ComponentInterface extends RenderDataInterface {
  id: string;
  initMode: string;
  options: any;
  renderRequestId: string;
}
