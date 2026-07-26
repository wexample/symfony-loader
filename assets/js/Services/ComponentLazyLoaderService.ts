import AppService from '../Class/AppService';
import AssetsService from './AssetsService';
import ComponentsService from './ComponentsService';
import VueService from './VueService';
import RenderNode from '../Class/RenderNode';
import Component from '../Class/Component';
import type Page from '../Class/Page';

export default class ComponentLazyLoaderService extends AppService {
  public static serviceName = 'componentLazyLoader';
  public static dependencies: typeof AppService[] = [AssetsService];

  private observer: IntersectionObserver | null = null;
  // Tracks which render node owns each placeholder, set in observeRoot.
  private placeholderParents = new WeakMap<HTMLElement, RenderNode>();

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
            this.observeRoot(page.el, page);
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

  observeRoot(root: Document | Element, parentRenderNode?: RenderNode): void {
    root
      .querySelectorAll<HTMLElement>('[data-component-lazy-path]:not([data-component-lazy-observed])')
      .forEach((el) => {
        el.setAttribute('data-component-lazy-observed', '1');
        if (parentRenderNode) {
          this.placeholderParents.set(el, parentRenderNode);
        }

        const trigger = el.dataset.componentLazyTrigger;
        if (trigger) {
          const triggerEl = document.querySelector<HTMLElement>(trigger);
          if (triggerEl) {
            const handler = () => {
              triggerEl.removeEventListener('click', handler);
              void this.loadFromElement(el).then(() => triggerEl.click());
            };
            triggerEl.addEventListener('click', handler);
          }
        } else if (this.observer) {
          this.observer.observe(el);
        }
      });
  }

  async load(
    path: string,
    props: Record<string, string> = {},
    placeholder?: HTMLElement,
    parentRenderNode?: RenderNode,
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
    const allAssets = this.collectAllAssets(data);
    const registered = assetsService.registerAssetsInCollection(allAssets);
    await assetsService.appendAssets(registered, AssetsService.createEmptyAssetsCollection());

    if (placeholder && data.body) {
      // Add cssClassName so attachHtmlElements can locate this placeholder via querySelector.
      // Insert body before (not replacing) — placeholder stays in DOM during init,
      // then attachHtmlElements removes it naturally as part of the mount lifecycle.
      placeholder.classList.add(data.cssClassName);
      const tmp = document.createElement('div');
      tmp.innerHTML = data.body;
      placeholder.before(...Array.from(tmp.childNodes));
    }

    if (data.vueTemplates && this.app.services.vue) {
      (this.app.services.vue as VueService).addTemplatesHtml(data.vueTemplates);
    }

    if (data.view && parentRenderNode) {
      const componentsService = this.app.services.components as ComponentsService;
      const component = await componentsService.createRenderNode(
        parentRenderNode.renderRequestId,
        data.view,
        data,
        parentRenderNode,
      );

      if (component) {
        await component.mountTree();
        await component.setNewTreeRenderNodeReady();
        parentRenderNode.components.push(component as Component);
      }
    }
  }

  private collectAllAssets(data: any): { css: any[]; js: any[] } {
    const assets = {
      css: [...(data.assets?.css ?? [])],
      js: [...(data.assets?.js ?? [])],
    };

    for (const sub of data.components ?? []) {
      const subAssets = this.collectAllAssets(sub);
      assets.css.push(...subAssets.css);
      assets.js.push(...subAssets.js);
    }

    return assets;
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

    const parentRenderNode = this.placeholderParents.get(el)
      ?? (this.app as any).layout;

    await this.load(path, props, el, parentRenderNode);
  }
}
