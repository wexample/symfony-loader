import AbstractNoticeService from './AbstractNoticeService';
import ComponentsService from './ComponentsService';

type BannerOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  message?: string;
  allowHtml?: boolean;
  actions?: Record<string, () => void>;
  class?: string;
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
    const created = service.createComponentFromTemplate(
      '@WexampleSymfonyDesignSystemBundle/components/banner',
      {
        id: bannerId,
        type,
        message: normalized.message,
        allowHtml: normalized.allowHtml,
        actions: normalized.actions,
        class: normalized.class
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
