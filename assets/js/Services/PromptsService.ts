import AppService from '../Class/AppService';
import LocaleService from './LocaleService';
import ToastService from './ToastService';
import { stringFormat } from '@wexample/js-helpers/Helper/String';

type PromptOptions = {
  title?: string;
  timeout?: number;
  sticky?: boolean;
  fatal?: boolean;
  showApplicationMessage?: boolean;
};

export default class PromptService extends AppService {
  public static dependencies: typeof AppService[] = [LocaleService, ToastService];
  protected service: PromptService;
  public elApplicationMessage: HTMLElement | null = null;
  public static serviceName: string = 'prompt';

  registerHooks() {
    return {
      app: {
        hookInit() {
          this.elApplicationMessage = document.getElementById('prompt-application-message');
        },
      },
    };
  }

  info(
    message: string,
    args: {} = {},
    options: PromptOptions = {}
  ) {
    return this.notify('info', message, args, options);
  }

  success(
    message: string,
    args: {} = {},
    options: PromptOptions = {}
  ) {
    return this.notify('success', message, args, options);
  }

  warning(
    message: string,
    args: {} = {},
    options: PromptOptions = {}
  ) {
    return this.notify('warning', message, args, options);
  }

  error(
    message: string,
    args: {} = {},
    options: PromptOptions = {}
  ) {
    return this.notify('error', message, args, options);
  }

  private notify(
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    args: {} = {},
    options: PromptOptions = {}
  ) {
    const formattedMessage = stringFormat(message, args);

    const toastService = this.app.getServiceOrFail(ToastService) as ToastService;
    void (toastService as any).show({
      type,
      title: options.title,
      message: formattedMessage,
      ...(options.sticky ? { sticky: true } : {}),
      ...(options.timeout ? { timeout: options.timeout } : {}),
    });

    if (options.showApplicationMessage) {
      this.showApplicationMessage(formattedMessage);
    }

    if (options.fatal) {
      throw new Error(formattedMessage);
    }
  }

  private showApplicationMessage(message: string): void {
    const el = this.elApplicationMessage;
    if (!el) {
      return;
    }

    el.textContent = message;
    el.classList.add('visible');
    setTimeout(() => {
      el.textContent = '';
      el.classList.remove('visible');
    }, 5000);
  }
}
