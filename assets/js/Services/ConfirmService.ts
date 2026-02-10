import AppService from '../Class/AppService';
import ComponentsService from './ComponentsService';

type ConfirmAction = {
  key: string;
  value: string;
  label: string;
  role?: 'primary' | 'secondary' | 'destructive';
};

type ConfirmPreset =
  | 'yes_no'
  | 'ok_cancel'
  | 'yes_no_all'
  | 'continue_cancel';

type ConfirmOptions = {
  title: string;
  message?: string;
  preset?: ConfirmPreset;
  actions?: ConfirmAction[];
  stackId?: string;
  position?: 'tl' | 'tr' | 'bl' | 'br';
  toast?: boolean;
};

export default class ConfirmService extends AppService {
  public static serviceName: string = 'confirm';

  private presets: Record<ConfirmPreset, ConfirmAction[]> = {
    yes_no: [
      { key: 'y', value: 'yes', label: 'Yes', role: 'primary' },
      { key: 'n', value: 'no', label: 'No', role: 'secondary' },
    ],
    ok_cancel: [
      { key: 'y', value: 'ok', label: 'Ok', role: 'primary' },
      { key: 'n', value: 'cancel', label: 'Cancel', role: 'secondary' },
    ],
    yes_no_all: [
      { key: 'y', value: 'yes', label: 'Yes', role: 'primary' },
      { key: 'Y', value: 'yes_all', label: 'Yes for all', role: 'secondary' },
      { key: 'n', value: 'no', label: 'No', role: 'secondary' },
    ],
    continue_cancel: [
      { key: 'y', value: 'continue', label: 'Continue', role: 'primary' },
      { key: 'n', value: 'cancel', label: 'Cancel', role: 'secondary' },
    ],
  };

  async confirm(options: ConfirmOptions): Promise<string> {
    return this.showConfirm({ ...options, toast: false });
  }

  async confirmToast(options: ConfirmOptions): Promise<string> {
    return this.showConfirm({ ...options, toast: true });
  }

  private async showConfirm(options: ConfirmOptions): Promise<string> {
    const actions = options.actions || this.presets[options.preset || 'yes_no'];

    return new Promise(async (resolve) => {
      const service = this.app.getServiceOrFail(ComponentsService) as ComponentsService;
      const mountTarget = this.getMountTarget(options);
      let instance: any = null;

      const created = service.createComponentFromTemplate(
        '@WexampleSymfonyDesignSystemBundle/components/confirm',
        {
          title: options.title,
          message: options.message,
          actions,
          variant: options.toast ? 'toast' : 'overlay',
          onResolve: async (value: string) => {
            resolve(value);
            if (instance) {
              if (options.toast) {
                await instance.exit();
              } else if (instance.overlayClose) {
                await instance.overlayClose();
              } else {
                await instance.exit();
              }
            }
          },
        },
        this.app.layout,
        mountTarget
      );

      const component = await Promise.resolve(created);
      if (!component) {
        resolve('cancel');
        return;
      }

      instance = component.instance;

      if (!options.toast && instance?.overlayOpen) {
        instance.overlayOpen();
      }
    });
  }

  private getMountTarget(options: ConfirmOptions): HTMLElement {
    if (options.toast) {
      const stack = document.querySelector('.toast-stack--items') as HTMLElement;
      return stack || document.body;
    }

    return document.body;
  }
}
