import AssetUsage from '../AssetUsage';
import AssetsInterface from '../../interfaces/AssetInterface';
import RenderNode from './../RenderNode';

export default class extends AssetUsage {
  public usageName: string = AssetUsage.USAGE_DEFAULT;

  public assetShouldBeLoaded(
    asset: AssetsInterface,
    renderNode: RenderNode
  ): boolean {
    // Default ones are always rendered.
    return true;
  }
}
