import AbstractNoticeService from './AbstractNoticeService';
import ComponentsService from './ComponentsService';
import InvariantViolationError from '../Errors/InvariantViolationError';

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

  /**
   * The component this shows, left for whoever ships one.
   *
   * Announcing something to the reader is a behaviour and belongs here; what
   * the announcement looks like is markup, and markup belongs to the design
   * system the application installed. Naming one here would have made every
   * app that uses the loader without that design system fail on its first
   * banner, with an error pointing at a package it never asked for. A design
   * system sets it by extending this class, and the application registers
   * that subclass.
   */
  public static componentPath: string | null = null;

  private instance: any | null = null;

  protected resolveComponentPath(): string {
    const path = (this.constructor as typeof BannerService).componentPath;

    if (!path) {
      throw new InvariantViolationError({
        message: 'No banner component: register the BannerService your design system ships, or set BannerService.componentPath.',
        code: 'ERR_BANNER_COMPONENT_UNSET',
        context: { serviceName: BannerService.serviceName },
      });
    }

    return path;
  }

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
      this.resolveComponentPath(),
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

    return this.getOrCreateDefaultTarget();
  }

  private getOrCreateDefaultTarget(): HTMLElement {
    const root = document.querySelector('#layout-initial') as HTMLElement | null;
    if (root) {
      const createdTarget = document.createElement('div');
      createdTarget.setAttribute('data-banner-target', '');
      root.appendChild(createdTarget);
      return createdTarget;
    }

    return this.app.layout.el || document.body;
  }
}
