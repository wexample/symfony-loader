import AssetUsage from '../AssetUsage';
import AssetsInterface from '../../Interfaces/AssetInterface';
import RenderNode from '../RenderNode';
import { RenderNodeResponsiveType } from '../../Services/ResponsiveService';

export default class extends AssetUsage {
  public usageName: string = AssetUsage.USAGE_RESPONSIVE;

  assetShouldBeLoaded(
    asset: AssetsInterface,
    renderNode: RenderNode & RenderNodeResponsiveType
  ): boolean {
    if (
      asset.usages.responsive &&
      asset.usages.responsive !== renderNode.responsiveSizeCurrent
    ) {
      return false;
    }

    return true;
  }
}
