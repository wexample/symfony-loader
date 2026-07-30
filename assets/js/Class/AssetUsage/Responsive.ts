import AssetUsage from '../AssetUsage';
import AssetsInterface from '../../Interfaces/AssetInterface';
import RenderNode from '../RenderNode';

export default class extends AssetUsage {
  public usageName: string = AssetUsage.USAGE_RESPONSIVE;

  assetShouldBeLoaded(
    asset: AssetsInterface,
    renderNode: RenderNode
  ): boolean {
    return !(asset.usages.responsive &&
      asset.usages.responsive !== renderNode.responsiveSizeCurrent);
  }
}
