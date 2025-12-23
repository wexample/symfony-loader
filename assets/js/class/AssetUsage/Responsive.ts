import AssetUsage from '../AssetUsage';
import AssetsInterface from '../../interfaces/AssetInterface';
import RenderNode from '../RenderNode';
import { RenderNodeResponsiveType } from '../../services/ResponsiveService';

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
