import AbstractNoticeService from './AbstractNoticeService';

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

export default class ToastService extends AbstractNoticeService {
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
    const normalized = this.normalizeOptions(options, 'toast');
    const timeout = normalized.timeout ?? 4000;
    this.dispatchShow('toast', {
      ...normalized,
      timeout,
      maxToasts: this.maxToasts
    });
    return normalized.id!;
  }

  dismiss(toastId: string) {
    this.dispatchDismiss('toast', toastId);
  }

  clear() {
    this.dispatchClear('toast');
  }

  private trimToasts() {
  }
}
