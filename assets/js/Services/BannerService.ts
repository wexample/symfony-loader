import AbstractNoticeService from './AbstractNoticeService';
import ComponentsService from './ComponentsService';

type BannerOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  message?: string;
  allowHtml?: boolean;
  actions?: Record<string, () => void>;
  class?: string;
  floating?: boolean;
  sticky?: boolean;
  target?: string | HTMLElement;
  animate?: boolean;
  timeout?: number;
};

export default class BannerService extends AbstractNoticeService {
  public static serviceName: string = 'banner';
  private instance: any | null = null;

  async show(options: BannerOptions | string): Promise<string> {
    const normalized = this.normalizeOptions(options, 'banner') as BannerOptions;
    const bannerId = normalized.id!;
    const type = normalized.type || 'default';

    if (this.instance) {
      await this.closeInstance();
    }

    const service = this.app.getServiceOrFail(ComponentsService) as ComponentsService;
    const mountTarget = this.resolveMountTarget(normalized.target);
    const created = service.createComponentFromTemplate(
      '@WexampleSymfonyDesignSystemBundle/components/banner',
      {
        id: bannerId,
        type,
        message: normalized.message,
        allowHtml: normalized.allowHtml,
        actions: normalized.actions,
        class: normalized.class,
        floating: normalized.floating !== false,
        sticky: normalized.sticky === true,
        animate: normalized.animate !== false,
        timeout: normalized.timeout
      },
      this.app.layout,
      mountTarget
    );

    const component = await Promise.resolve(created);
    if (!component) {
      return bannerId;
    }

    this.instance = component.instance;
    return bannerId;
  }

  async dismiss() {
    await this.closeInstance();
  }

  async clear() {
    await this.closeInstance();
  }

  private async closeInstance(): Promise<void> {
    if (!this.instance) {
      return;
    }
    const instance = this.instance;
    this.instance = null;
    await instance.exit();
  }

  private resolveMountTarget(target?: string | HTMLElement): HTMLElement {
    if (target) {
      if (typeof target === 'string') {
        const el = document.querySelector(target) as HTMLElement | null;
        if (el) {
          return el;
        }
      } else {
        return target;
      }
    }

    const layoutTarget = document.querySelector('[data-banner-target]') as HTMLElement | null;
    if (layoutTarget) {
      return layoutTarget;
    }

    return this.app.layout.el || document.body;
  }
}
