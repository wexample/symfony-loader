<script>
import { ResponsiveServiceEvents } from '../js/services/ResponsiveService';
import { Attribute, AttributeValue, TagName } from '../js/helpers/DomHelper';
import { shallowCopy as ArrayShallowCopy } from '../js/helpers/ArrayHelper';
import { AssetsServiceType } from '../js/services/AssetsService';
import Explorer from './explorer';
import { EventsServiceEvents } from '../js/services/EventsService';
import AbstractRenderNodeService from '../js/services/AbstractRenderNodeService';

export default {
  extends: Explorer,

  components: {
    'explorer-item': '@WexampleSymfonyDesignSystemBundle/vue/debug-assets-explorer-item',
  },

  data() {
    return {
      allAssets: [],
      assets: {
        css: [],
        js: [],
      },
      listFilter: null,
      loadedPaths: {
        css: {},
        js: {},
      },
      onChangeResponsiveSizeProxy: this.onChangeResponsiveSize.bind(this),
      updateEvents: [
        AbstractRenderNodeService.CREATE_RENDER_NODE,
        ResponsiveServiceEvents.RESPONSIVE_CHANGE_SIZE,
      ],
      updateTime: 0,
    };
  },

  mounted() {
    this.app.services.events.listen(
        this.updateEvents,
        this.onChangeResponsiveSizeProxy
    );

    this.onChangeResponsiveSize();
  },

  unmounted() {
    this.app.services.events.forget(
        this.updateEvents,
        this.onChangeResponsiveSizeProxy
    );
  },

  methods: {
    assetLog(asset) {
      console.log(asset);
    },

    buildCssAsset(asset) {
      return {
        'asset-active': asset.active,
        'asset-loaded': asset.loaded,
        'asset-rendered': asset.rendered,
      };
    },

    getAssetsTypeList(type) {
      if (this.selectedItem) {
        return ArrayShallowCopy(
            this.selectedItem.object.renderData.assets[type]
        );
      }

      return [];
    },

    onChangeResponsiveSize() {
      this.update();
    },

    update() {
      this.updateTime = new Date().getTime();
      this.updateAssetsList();
      this.updateAssetsJs();
      this.updateAssetsCss();

      // Ask for display refresh.
      this.$nextTick(() => {
        // Hotfix to remove errors event using $nextTick,
        // vue seems not to be mounted on updating debug render node.
        setTimeout(() => {
          this.app.services.events.trigger(EventsServiceEvents.DISPLAY_CHANGED);
        }, 100)
      });
    },

    selectItem() {
      Explorer.methods.selectItem.apply(this, arguments);

      this.update();
    },

    updateAssetsList() {
      let list = [];

      [AssetsServiceType.CSS, AssetsServiceType.JS].forEach((type) => {
        if (this.listFilter === null || this.listFilter === type) {
          list = [...list, ...this.getAssetsTypeList(type)];
        }
      });

      this.allAssets = list;
    },

    updateAssetsJs() {
      // Base loaded assets
      document.querySelectorAll(TagName.SCRIPT).forEach((el) => {
        let src = el.getAttribute(Attribute.SRC);

        // Avoid inline scripts.
        if (src !== null) {
          this.loadedPaths.js[src] = src;
        }
      });
    },

    updateAssetsCss() {
      // Base loaded assets
      document
          .querySelectorAll(
              `${TagName.LINK}[${Attribute.REL}=${AttributeValue.STYLESHEET}]`
          )
          .forEach((el) => {
            let href = el.getAttribute(Attribute.HREF);
            this.loadedPaths.css[href] = href;
          });
    },

    shortenAssetPath(asset) {
      return asset.path.replace(/^(\/build\/)/, '');
    },
  },
};
</script>
