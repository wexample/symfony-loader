import AbstractNoticeService from './AbstractNoticeService';
import type { NotificationActionInterface } from '../Interfaces/FormResponsePayloadInterface';

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
  action?: NotificationActionInterface;
};

// A toast as it is reported afterwards: what the page said, and when.
export type ToastShown = {
  at: number;
  type?: string;
  title?: string;
  message?: string;
};

export default class ToastService extends AbstractNoticeService {
  public static serviceName: string = 'toast';
  private maxToasts: number = 6;

  // What the page said in toasts, for whoever reports what an action did —
  // an agent's tool, told what the reader was shown.
  private shown: ToastShown[] = [];

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
    this.shown.push({
      at: Date.now(),
      type: normalized.type,
      title: normalized.title,
      message: normalized.allowHtml ? this.toText(normalized.message) : normalized.message,
    });
    this.dispatchShow('toast', {
      ...normalized,
      timeout,
      maxToasts: this.maxToasts
    });
    return normalized.id!;
  }

  // The toasts shown from that moment on (a timestamp, in ms).
  shownSince(since: number): Omit<ToastShown, 'at'>[] {
    return this.shown
      .filter((toast) => toast.at >= since)
      .map(({ at, ...toast }) => toast);
  }

  private toText(html?: string): string | undefined {
    if (html === undefined) {
      return undefined;
    }

    const el = document.createElement('div');
    el.innerHTML = html;

    return el.textContent ?? '';
  }

  dismiss(toastId: string) {
    this.dispatchDismiss('toast', toastId);
  }

  clear() {
    this.dispatchClear('toast');
  }

  async withAction(
    action: () => Promise<unknown>,
    messages: { success: string; error: string }
  ): Promise<void> {
    try {
      await action();
      this.show({ type: 'success', message: messages.success });
    } catch (error) {
      console.error(error);
      this.show({ type: 'error', message: messages.error });
    }
  }

  private trimToasts() {
  }
}
