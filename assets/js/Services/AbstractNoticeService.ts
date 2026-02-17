import AppService from '../Class/AppService';

type NoticeOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  timeout?: number;
  sticky?: boolean;
  allowHtml?: boolean;
  position?: string;
  stackId?: string;
  actions?: Record<string, () => void>;
  class?: string;
};

export default class AbstractNoticeService extends AppService {
  // Implemented by concrete services (Toast/Banner).
  show(_options: NoticeOptions | string): any {
    throw new Error('AbstractNoticeService.show must be implemented by subclasses.');
  }

  protected normalizeOptions(options: NoticeOptions | string, prefix: string): NoticeOptions {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return {
      ...options,
      id: options.id || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: options.type || 'default'
    };
  }

  protected dispatchShow(eventPrefix: string, detail: Record<string, any>) {
    document.dispatchEvent(new CustomEvent(`${eventPrefix}:show`, { detail }));
  }

  protected dispatchDismiss(eventPrefix: string, id: string) {
    document.dispatchEvent(new CustomEvent(`${eventPrefix}:dismiss`, { detail: { id } }));
  }

  protected dispatchClear(eventPrefix: string) {
    document.dispatchEvent(new CustomEvent(`${eventPrefix}:clear`));
  }

  info(message: string, options: NoticeOptions = {}) {
    return this.show({ ...options, type: 'info', message } as any);
  }

  success(message: string, options: NoticeOptions = {}) {
    return this.show({ ...options, type: 'success', message } as any);
  }

  warning(message: string, options: NoticeOptions = {}) {
    return this.show({ ...options, type: 'warning', message } as any);
  }

  error(message: string, options: NoticeOptions = {}) {
    return this.show({ ...options, type: 'error', message } as any);
  }
}
