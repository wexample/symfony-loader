import AppChild from './AppChild';
import AssetsInterface from '../interfaces/AssetInterface';
import RenderNode from './RenderNode';

export default abstract class AssetUsage extends AppChild {
  public static USAGE_ANIMATIONS: string = 'animations';

  public static USAGE_COLOR_SCHEME: string = 'color_scheme';

  public static USAGE_DEFAULT: string = 'default';

  public static USAGE_FONTS: string = 'fonts';

  public static USAGE_MARGINS: string = 'margins';

  public static USAGE_RESPONSIVE: string = 'responsive';

  public static USAGES: string[] = [
    // The order is the same as backend order.
    // @see AssetsService.php.
    AssetUsage.USAGE_DEFAULT,
    AssetUsage.USAGE_COLOR_SCHEME,
    AssetUsage.USAGE_RESPONSIVE,
    AssetUsage.USAGE_ANIMATIONS,
    AssetUsage.USAGE_FONTS,
  ];

  public abstract usageName: string;

  public assetShouldBeLoaded(
    asset: AssetsInterface,
    renderNode?: RenderNode
  ): boolean {
    if (asset.usage === this.usageName) {
      return !(renderNode && asset.usages[this.usageName] != renderNode.usages[this.usageName]);
    }
  }
}
