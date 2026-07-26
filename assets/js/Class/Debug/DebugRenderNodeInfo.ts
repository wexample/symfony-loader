import RenderNode from '../RenderNode';
import { h } from 'vue';
import { DOM_TAG_NAME } from '@wexample/js-helpers/Helper/Dom';

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
      displayBreakpoints: this.app.layout.vars.displayBreakpoints,
      opened: false,
    };
  },

  render() {
    let elOpener = h(
      DOM_TAG_NAME.A,
      {
        class: `develop-render-node__info develop-render-node__info--${this.opened ? 'opened' : 'closed'}`,
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

    let renderLineTitle = (title) => h(
      DOM_TAG_NAME.DIV,
      { class: 'develop-render-node__info__line-title' },
      title
    );

    let renderResponsive = (type) => h(
      DOM_TAG_NAME.DIV,
      { class: 'develop-render-node__info__line' },
      [
        renderLineTitle(type.toUpperCase()),
        Object.keys(this.app.layout.vars.displayBreakpoints).map((size) =>
          h(
            DOM_TAG_NAME.DIV,
            {
              class: {
                active: this.app.services.responsive.responsiveSizeCurrent === size,
                available: this.hasResponsiveAsset(type, size),
              },
            },
            size.toUpperCase()
          )
        ),
      ]
    );

    return h(
      DOM_TAG_NAME.DIV,
      {
        class: 'develop-render-node__info',
        style: this.styleObject(),
      },
      [
        elOpener,
        h(DOM_TAG_NAME.DIV, {}, this.renderNode.view),
        renderResponsive('css'),
        renderResponsive('js'),
      ]
    );
  },

  methods: {
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

    styleObject() {
      return {
        backgroundColor: this.debugRenderNode.getBorderColor(),
      };
    },
  },
};
