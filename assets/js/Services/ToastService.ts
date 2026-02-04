import AppService from '../Class/AppService';

type ToastOptions = {
  id?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  timeout?: number;
  sticky?: boolean;
  allowHtml?: boolean;
};

export default class ToastService extends AppService {
  public static serviceName: string = 'toast';
  private containerEl?: HTMLElement;
  private toasts: Map<string, HTMLElement> = new Map();
  private maxToasts: number = 6;

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.containerEl = document.getElementById('toast-container') as HTMLElement;
          if (!this.containerEl) {
            this.containerEl = document.createElement('div');
            this.containerEl.id = 'toast-container';
            this.containerEl.className = 'toast-container';
            document.body.appendChild(this.containerEl);
          }
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

    if (!this.containerEl) {
      return toastId;
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast--${type}`;
    toastEl.setAttribute('data-toast-id', toastId);

    if (options.title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'toast--title';
      titleEl.textContent = options.title;
      toastEl.appendChild(titleEl);
    }

    const messageEl = document.createElement('div');
    messageEl.className = 'toast--message';
    if (options.allowHtml && options.message) {
      messageEl.innerHTML = options.message;
    } else {
      messageEl.textContent = options.message || '';
    }
    toastEl.appendChild(messageEl);

    this.containerEl.appendChild(toastEl);
    this.toasts.set(toastId, toastEl);

    this.trimToasts();

    if (!options.sticky) {
      setTimeout(() => this.dismiss(toastId), timeout);
    }

    return toastId;
  }

  dismiss(toastId: string) {
    const toastEl = this.toasts.get(toastId);
    if (!toastEl) {
      return;
    }

    toastEl.remove();
    this.toasts.delete(toastId);
  }

  clear() {
    this.toasts.forEach((el) => el.remove());
    this.toasts.clear();
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
    if (!this.containerEl) {
      return;
    }

    while (this.toasts.size > this.maxToasts) {
      const [id] = this.toasts.keys();
      this.dismiss(id);
    }
  }
}
