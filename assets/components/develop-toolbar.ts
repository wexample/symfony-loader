import Component from '../js/Class/Component';
import VueService from '../js/Services/VueService';

export default class extends Component {
  protected async activateListeners(): Promise<void> {
    const mountEl = this.el.querySelector<HTMLElement>('.develop-toolbar__mount');
    if (mountEl && this.app.services.vue) {
      const vueService = this.app.services.vue as VueService;
      const component = vueService.initComponent('@WexampleSymfonyLoaderBundle/vue/debug-assets', this);
      vueService.createApp(component as Record<string, any>).mount(mountEl);
    }
  }

  protected async deactivateListeners(): Promise<void> {}
}
