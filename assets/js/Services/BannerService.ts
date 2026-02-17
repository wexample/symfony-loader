import AppService from '../Class/AppService';

type BannerOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  allowHtml?: boolean;
  sticky?: boolean;
  position?: 'top' | 'bottom';
  actions?: Record<string, () => void>;
};

export default class BannerService extends AppService {
  public static serviceName: string = 'banner';

  show(options: BannerOptions | string): string {
    if (typeof options === 'string') {
      options = { message: options };
    }

    const bannerId = options.id || `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    document.dispatchEvent(new CustomEvent('banner:show', {
      detail: {
        id: bannerId,
        type: options.type || 'default',
        title: options.title,
        message: options.message,
        allowHtml: options.allowHtml,
        sticky: options.sticky,
        position: options.position,
        actions: options.actions,
      }
    }));

    return bannerId;
  }

  dismiss(bannerId: string) {
    document.dispatchEvent(new CustomEvent('banner:dismiss', {
      detail: {
        id: bannerId
      }
    }));
  }

  clear() {
    document.dispatchEvent(new CustomEvent('banner:clear'));
  }
}
