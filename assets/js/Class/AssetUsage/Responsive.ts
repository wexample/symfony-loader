import AssetUsage from '../AssetUsage';
import AssetsInterface from '../../Interfaces/AssetInterface';
import RenderNode from '../RenderNode';

export default class extends AssetUsage {
  public usageName: string = AssetUsage.USAGE_RESPONSIVE;

  // Every instance of a view shares its stylesheets, and each only draws from
  // the one of its own size, under its own responsive class. A sheet therefore
  // stays while any instance is at its size: asked of one node alone, a node
  // at another size — or at none yet, not mounted — took it from under the one
  // it was loading for, and that one waited for a load the removed tag would
  // never announce.
  assetShouldBeLoaded(
    asset: AssetsInterface,
    renderNode: RenderNode
  ): boolean {
    const size = asset.usages.responsive;

    if (!size || renderNode.responsiveSizeCurrent === size) {
      return true;
    }

    // Not measured yet: it has no size to ask for, and leaves every sheet as
    // it is.
    if (!renderNode.responsiveSizeCurrent) {
      return !!asset.active;
    }

    return this.hasInstanceAtSize(this.app.layout, asset, size);
  }

  // The nodes sharing a sheet are the ones holding it: registered assets are
  // one object per file, and a sheet of a size is named after it, not after
  // the view it styles.
  private hasInstanceAtSize(node: RenderNode, asset: AssetsInterface, size: string): boolean {
    if (!node) {
      return false;
    }

    if (
      !node.destroyed
      && (node as any).responsiveSizeCurrent === size
      && node.renderData?.assets?.[asset.type]?.includes(asset)
    ) {
      return true;
    }

    return node.eachChildRenderNode().some((child) => this.hasInstanceAtSize(child, asset, size));
  }
}
