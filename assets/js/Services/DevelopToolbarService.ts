import AppService from '../Class/AppService';
import KeyboardService from './KeyboardService';

export default class DevelopToolbarService extends AppService {
  public static serviceName = 'developToolbar';
  public static dependencies: typeof AppService[] = [KeyboardService];

  private get toolbar(): HTMLElement | null {
    return document.querySelector('.develop-toolbar');
  }

  registerHooks() {
    return {
      app: {
        hookInit() {
          document.addEventListener('click', (e) => {
            if ((e.target as Element).closest('[data-develop-toolbar-toggle]')) {
              e.preventDefault();
              this.toggle();
            }
          });

          (this.app.services.keyboard as KeyboardService).registerKeyDown(
            this,
            'D',
            () => { this.toggle(); },
            {
              preventDefault: true,
              enabled: (e) => e.ctrlKey && e.shiftKey,
            }
          );
        },
      },
    };
  }

  toggle(): void {
    this.toolbar?.classList.toggle('develop-toolbar--open');
  }
}
