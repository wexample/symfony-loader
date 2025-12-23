import Component from '../js/class/Component';
import ComponentInterface from '../js/interfaces/RenderData/ComponentInterface';
import { App as VueApp } from 'vue/dist/vue.esm-bundler';

export default class VueComponent extends Component {
  vue?: VueApp;

  loadFirstRenderData(renderData: ComponentInterface) {
    // First component render data is stored into service,
    // in order to reuse sub components definitions
    // as components ids in vue template stay the same.
    let name = renderData.options.vueComName;
    let cache = this.app.services.vue.vueRenderDataCache;

    if (cache[name]) {
      renderData.components = cache[name].components;
    } else {
      cache[name] = renderData;
    }

    super.loadFirstRenderData(renderData);
  }

  attachHtmlElements() {
    super.attachHtmlElements();

    this.vue = this.app.services.vue.createVueAppForComponent(this).mount(this.el);
  }
}
