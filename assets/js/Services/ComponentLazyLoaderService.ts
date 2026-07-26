import AppService from '../Class/AppService';
import AssetsService from './AssetsService';
import type Page from '../Class/Page';

export default class ComponentLazyLoaderService extends AppService {
  public static serviceName = 'componentLazyLoader';
  public static dependencies: typeof AppService[] = [AssetsService];

  private observer: IntersectionObserver | null = null;

  registerHooks() {
    return {
      app: {
        hookInit() {
          this.initObserver();
          this.observeRoot(document);
        },
      },
      page: {
        async hookInitPage(page: Page) {
          if (page.el) {
            this.observeRoot(page.el);
          }
        },
      },
    };
  }

  private initObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            this.observer?.unobserve(el);
            void this.loadFromElement(el);
          }
        }
      },
      { rootMargin: '50px' }
    );
  }

  observeRoot(root: Document | Element): void {
    if (!this.observer) return;

    root
      .querySelectorAll<HTMLElement>('[data-component-lazy-path]:not([data-component-lazy-observed])')
      .forEach((el) => {
        el.setAttribute('data-component-lazy-observed', '1');
        this.observer!.observe(el);
      });
  }

  async load(
    path: string,
    props: Record<string, string> = {},
    placeholder?: HTMLElement
  ): Promise<void> {
    const url = new URL('/_system/component/render', window.location.origin);
    url.searchParams.set('path', path);

    for (const [key, value] of Object.entries(props)) {
      url.searchParams.set(`props[${key}]`, value);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.ok) return;

    const assetsService = this.app.services.assets as AssetsService;

    if (data.assets) {
      const registered = assetsService.registerAssetsInCollection(data.assets);
      await assetsService.appendAssets(registered, AssetsService.createEmptyAssetsCollection());
    }

    if (placeholder && data.body) {
      const tmp = document.createElement('div');
      tmp.innerHTML = data.body;
      placeholder.replaceWith(...Array.from(tmp.childNodes));
    }
  }

  private async loadFromElement(el: HTMLElement): Promise<void> {
    const path = el.dataset.componentLazyPath ?? '';
    if (!path) return;

    let props: Record<string, string> = {};
    const propsRaw = el.dataset.componentLazyProps;
    if (propsRaw) {
      try {
        props = JSON.parse(propsRaw);
      } catch {
        // Ignore invalid JSON
      }
    }

    await this.load(path, props, el);
  }
}
