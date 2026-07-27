import Component from '../js/Class/Component';
import DebugService from '../js/Services/DebugService';

const HEIGHT_VAR = '--develop-toolbar-height';
const SF_TOOLBAR_SELECTOR = '.sf-toolbar';

export default class DevelopToolbar extends Component {
  private activeTab: string = 'assets';
  private debugInitialized: boolean = false;

  async activateListeners() {
    super.activateListeners();

    this.el.querySelectorAll<HTMLElement>('[data-tab]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(el.dataset.tab);
      });
    });

    this.el.querySelector('[data-symfony-toolbar-toggle]')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleSymfonyToolbar();
    });

    this.initResize();
    this.initHeightObserver();
  }

  private toggleSymfonyToolbar() {
    const sf = document.querySelector<HTMLElement>(SF_TOOLBAR_SELECTOR);
    if (sf) {
      sf.style.display = sf.style.display === 'none' ? '' : 'none';
    }
  }

  private initResize() {
    const handle = this.el.querySelector<HTMLElement>('.develop-toolbar__resize-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = this.el.offsetHeight;

      const onMove = (e: MouseEvent) => {
        const newHeight = Math.max(80, startHeight - (e.clientY - startY));
        this.el.style.height = `${newHeight}px`;
        this.updateHeightVar(newHeight);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  private initHeightObserver() {
    new ResizeObserver((entries) => {
      const height = entries[0]?.borderBoxSize[0]?.blockSize ?? this.el.offsetHeight;
      this.updateHeightVar(height);
    }).observe(this.el);
  }

  private updateHeightVar(height: number) {
    document.documentElement.style.setProperty(HEIGHT_VAR, `${height}px`);
  }

  private async switchTab(tab: string) {
    this.activeTab = tab;

    this.el.querySelectorAll('[data-tab]').forEach((el: HTMLElement) => {
      el.classList.toggle('tabs--item--active', el.dataset.tab === tab);
    });

    this.el.querySelectorAll('[data-tab-panel]').forEach((el: HTMLElement) => {
      el.classList.toggle('develop-toolbar__mount--hidden', el.dataset.tabPanel !== tab);
    });

    if (tab === 'nodes') {
      await this.initDebug();
    }

    const debugService = this.app.services.debug as DebugService | undefined;
    if (debugService?.elDebugHelpers) {
      debugService.elDebugHelpers.style.display = tab === 'nodes' ? '' : 'none';
    }
  }

  private async initDebug() {
    if (this.debugInitialized) return;
    this.debugInitialized = true;

    const debugService = new DebugService(this.app);
    this.app.services.debug = debugService;
    debugService.init();
    debugService.elDebugHelpers.style.display = 'none';

    await this.app.layout.forEachTreeRenderNode((node) => {
      debugService.initRenderNode(node);
    });
  }
}
