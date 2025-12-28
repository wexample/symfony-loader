import Page from './Page';
import RenderNode from './RenderNode';
import LayoutInterface from '../interfaces/RenderData/LayoutInterface';

export default abstract class extends RenderNode {
  public page: Page;
  public pageFocused?: Page;
  public renderData: LayoutInterface;

  public getRenderNodeType(): string {
    return 'layout';
  }
}
