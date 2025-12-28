import AppService from '../class/AppService';
import LocaleService from './LocaleService';
import { format as StringFormat } from '../helpers/StringHelper';

export default class PromptService extends AppService {
  public static dependencies: typeof AppService[] = [LocaleService];
  protected service: PromptService;
  public elApplicationMessage: HTMLElement;
  public static serviceName: string = 'prompt';

  registerHooks() {
    return {
      app: {
        hookInit() {
          this.elApplicationMessage = document.getElementById('prompt-application-message');
        },
      },
    };
  };

  systemError(
    message: string,
    args: {} = {},
    debugData: any = null,
    fatal: boolean = false
  ) {
    message = StringFormat(message, args);

    if (fatal) {
      throw new Error(message);
    } else {
      console.error(message);
    }

    if (debugData) {
      console.warn(debugData);
    }
  }

  applicationError(
    message: string,
    args: {} = {},
    debugData: any = null,
    fatal: boolean = false
  ) {
    this.systemError(
      message,
      args,
      debugData,
      fatal,
    );

    const el = this.elApplicationMessage;

    el.innerHTML = message;
    el.classList.add('visible');

    setTimeout(() => {
      el.innerHTML = '';
      el.classList.remove('visible');
    }, 5000);
  }
}
