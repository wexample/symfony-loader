import { ref } from 'vue';
import AppService from '../Class/AppService';
import KeyboardService from './KeyboardService';
import VueService from './VueService';

const isOpen = ref(false);

const toolbarComponent = {
  setup() {
    return { isOpen };
  },
  template: `
    <div class="develop-toolbar" v-show="isOpen">
      <div class="develop-toolbar__tabs">
        <button class="develop-toolbar__tab develop-toolbar__tab--active">Debug</button>
      </div>
      <div class="develop-toolbar__panel">
        <em>Develop toolbar</em>
      </div>
    </div>
  `,
};

export default class DevelopToolbarService extends AppService {
  public static serviceName = 'developToolbar';
  public static dependencies: typeof AppService[] = [KeyboardService, VueService];

  registerHooks() {
    return {
      app: {
        hookInit() {
          const el = document.createElement('div');
          el.id = 'develop-toolbar-root';
          document.body.appendChild(el);

          (this.app.services.vue as VueService).createApp(toolbarComponent).mount(el);

          (this.app.services.keyboard as KeyboardService).registerKeyDown(
            this,
            'D',
            () => { isOpen.value = !isOpen.value; },
            {
              preventDefault: true,
              enabled: (e) => e.ctrlKey && e.shiftKey,
            }
          );
        },
      },
    };
  }
}
