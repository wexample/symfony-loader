import Component from '../js/Class/Component';
import ComponentInterface from '../js/Interfaces/RenderData/ComponentInterface';
import App from '../js/Class/App';
import { App as VueApp } from 'vue';

type VueAppWithApp = VueApp & { app?: App };

export default class VueComponent extends Component {
  vue?: VueAppWithApp;

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

    const vueApp = this.app.services.vue.createVueAppForComponent(this) as VueAppWithApp;
    vueApp.app = this.app;
    vueApp.mount(this.el);

    this.vue = vueApp;
  }
}
