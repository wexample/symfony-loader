import Component from '../js/Class/Component';
import DebugService from '../js/Services/DebugService';

export default class DevelopToolbar extends Component {
  private activeTab: string = 'assets';
  private debugInitialized: boolean = false;

  async activateListeners() {
    super.activateListeners();

    this.el.querySelectorAll<HTMLElement>('[data-develop-toolbar-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.app.layout.el.classList.toggle('develop-toolbar--open');
      });
    });

    this.el.querySelectorAll<HTMLElement>('[data-tab]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(el.dataset.tab);
      });
    });
  }

  private switchTab(tab: string) {
    this.activeTab = tab;

    this.el.querySelectorAll('[data-tab]').forEach((el: HTMLElement) => {
      el.classList.toggle('tabs--item--active', el.dataset.tab === tab);
    });

    this.el.querySelectorAll('[data-tab-panel]').forEach((el: HTMLElement) => {
      el.classList.toggle('develop-toolbar__mount--hidden', el.dataset.tabPanel !== tab);
    });

    if (tab === 'nodes') {
      this.initDebug();
    }
  }

  private async initDebug() {
    if (this.debugInitialized) return;
    this.debugInitialized = true;

    const debugService = new DebugService(this.app);
    this.app.services.debug = debugService;
    debugService.init();

    await this.app.layout.forEachTreeRenderNode((node) => {
      debugService.initRenderNode(node);
    });
  }
}
