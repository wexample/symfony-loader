import AppService from '../Class/AppService';
import ComponentsService from './ComponentsService';

type BannerOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  message?: string;
  allowHtml?: boolean;
  actions?: Record<string, () => void>;
  class?: string;
};

export default class BannerService extends AppService {
  public static serviceName: string = 'banner';
  private instance: any | null = null;

  async show(options: BannerOptions | string): Promise<string> {
    if (typeof options === 'string') {
      options = { message: options };
    }

    const bannerId = options.id || `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = options.type || 'default';

    if (this.instance) {
      await this.closeInstance();
    }

    const service = this.app.getServiceOrFail(ComponentsService) as ComponentsService;
    const created = service.createComponentFromTemplate(
      '@WexampleSymfonyDesignSystemBundle/components/banner',
      {
        id: bannerId,
        type,
        message: options.message,
        allowHtml: options.allowHtml,
        actions: options.actions,
        class: options.class
      },
      this.app.layout,
      this.app.layout.el || document.body
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

  info(message: string, options: BannerOptions = {}) {
    return this.show({ ...options, type: 'info', message });
  }

  success(message: string, options: BannerOptions = {}) {
    return this.show({ ...options, type: 'success', message });
  }

  warning(message: string, options: BannerOptions = {}) {
    return this.show({ ...options, type: 'warning', message });
  }

  error(message: string, options: BannerOptions = {}) {
    return this.show({ ...options, type: 'error', message });
  }

  private async closeInstance(): Promise<void> {
    if (!this.instance) {
      return;
    }
    const instance = this.instance;
    this.instance = null;
    if (instance.closeWithAnimation) {
      await instance.closeWithAnimation();
      return;
    }
    if (instance.exit) {
      await instance.exit();
    }
  }
}
