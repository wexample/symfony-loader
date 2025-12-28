// Script par of a Vue component.
import RenderNode from '../RenderNode';
import { h } from 'vue';
import Page from '../Page';
import { TagName } from '../../helpers/DomHelper';
import AssetsInterface from '../../interfaces/AssetInterface';

export default {
  props: {
    app: Object,
    debugRenderNode: Object,
    renderNode: RenderNode,
    renderData: {
      type: Object,
      default: {},
    },
  },

  data() {
    return {
      backgroundColor: 'transparent',
      displayBreakpoints: this.app.layout.vars.displayBreakpoints,
      opened: false,
    };
  },

  render() {
    let elOpener = h(
      TagName.A,
      {
        class: `debug-info debug-info-${this.opened ? 'opened' : 'closed'}`,
        style: this.styleObject(),
        href: 'javascript:void(0)',
        onClick: () => {
          this.opened = !this.opened;
        },
      },
      this.opened ? '-' : '+'
    );

    if (!this.opened) {
      return elOpener;
    }

    let renderLineTitle = (title) => {
      return h(
        TagName.DIV,
        {
          class: 'line-title',
        },
        title
      );
    };

    let renderResponsive = (type) => {
      return h(
        TagName.DIV,
        {
          class: ['debug-info-line', 'display-breakpoints'],
        },
        [
          renderLineTitle(type.toUpperCase()),
          Object.keys(this.app.layout.vars.displayBreakpoints).map((size) => {
            return h(
              TagName.DIV,
              {
                class: {
                  active:
                    this.app.services.responsive.responsiveSizeCurrent === size,
                  available: this.hasResponsiveAsset(type, size),
                },
              },
              size.toUpperCase()
            );
          }),
        ]
      );
    };

    let renderPage = () => {
      if (this.renderNode instanceof Page) {
        return h(
          TagName.DIV,
          {
            class: 'debug-info-line',
          },
          [
            renderLineTitle('COL.S'),
          ]
        );
      }
    };

    return h(
      TagName.DIV,
      {
        class: 'debug-info',
        style: this.styleObject(),
      },
      [
        elOpener,
        h(TagName.DIV, {}, this.renderDebugInfo()),
        renderPage(),
        renderResponsive('css'),
        renderResponsive('js'),
      ]
    );
  },

  methods: {
    renderDebugInfo() {
      return [this.renderNode.view].join('<br>');
    },

    hasResponsiveAsset(type: string, size: string): boolean {
      if (this.renderNode.assets) {
        for (let asset of this.renderNode.assets[type]) {
          if (asset.responsive === size) {
            return true;
          }
        }
      }

      return false;
    },

    hasColorSchemeAsset(type: string, scheme: string) {
      if (this.renderNode.assets) {
        let asset: AssetsInterface;

        for (asset of this.renderNode.assets[type]) {
          // TODO Context is wrong and always true.
          if (asset.colorScheme === scheme) {
            return true;
          }
        }
      }

      return true;
    },

    styleObject() {
      return {
        backgroundColor: this.debugRenderNode.getBorderColor(),
      };
    },
  },
};
