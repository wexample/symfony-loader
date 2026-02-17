import AppService from '../Class/AppService';

type ToastOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  timeout?: number;
  sticky?: boolean;
  allowHtml?: boolean;
  position?: 'tl' | 'tr' | 'bl' | 'br';
  stackId?: string;
  actions?: Record<string, () => void>;
};

export default class ToastService extends AppService {
  public static serviceName: string = 'toast';
  private maxToasts: number = 6;

  registerHooks() {
    return {
      app: {
        hookInit: () => {
        }
      }
    };
  }

  show(options: ToastOptions | string): string {
    if (typeof options === 'string') {
      options = { message: options };
    }

    const toastId = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = options.type || 'default';
    const timeout = options.timeout ?? 4000;

    document.dispatchEvent(new CustomEvent('toast:show', {
      detail: {
        id: toastId,
        type,
        title: options.title,
        message: options.message,
        allowHtml: options.allowHtml,
        actions: options.actions,
        timeout,
        sticky: options.sticky,
        position: options.position,
        stackId: options.stackId,
        maxToasts: this.maxToasts
      }
    }));

    return toastId;
  }

  dismiss(toastId: string) {
    document.dispatchEvent(new CustomEvent('toast:dismiss', {
      detail: {
        id: toastId
      }
    }));
  }

  clear() {
    document.dispatchEvent(new CustomEvent('toast:clear'));
  }

  info(message: string, options: ToastOptions = {}) {
    return this.show({ ...options, type: 'info', message });
  }

  success(message: string, options: ToastOptions = {}) {
    return this.show({ ...options, type: 'success', message });
  }

  warning(message: string, options: ToastOptions = {}) {
    return this.show({ ...options, type: 'warning', message });
  }

  error(message: string, options: ToastOptions = {}) {
    return this.show({ ...options, type: 'error', message });
  }

  private trimToasts() {
  }
}
