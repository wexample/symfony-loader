import AppService from '../Class/AppService';
import ComponentsService from './ComponentsService';

type ConfirmAction = {
  key: string;
  value: string;
  label: string;
  role?: 'primary' | 'secondary' | 'destructive';
  keepOpen?: boolean;
};

type ConfirmPreset =
  | 'yes_no'
  | 'ok_cancel'
  | 'yes_no_all'
  | 'continue_cancel';

type ConfirmOptions = {
  title?: string;
  message: string;
  preset?: ConfirmPreset;
  actions?: ConfirmAction[];
  stackId?: string;
  position?: 'tl' | 'tr' | 'bl' | 'br';
  toast?: boolean;
};

export default class ConfirmService extends AppService {
  public static serviceName: string = 'confirm';
  private instances: Set<any> = new Set();

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
          onResolve: async (action: ConfirmAction | string) => {
            const resolvedAction: ConfirmAction =
              typeof action === 'string'
                ? { key: '', value: action, label: action }
                : action;
            resolve(resolvedAction.value);
            if (instance) {
              if (resolvedAction.keepOpen) {
                return;
              }
              await this.closeInstance(instance, options.toast);
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
      this.trackInstance(instance);

      if (!options.toast && instance?.overlayOpen) {
        instance.overlayOpen();
      }
    });
  }

  public async closeAll(): Promise<void> {
    const instances = Array.from(this.instances);
    await Promise.all(
      instances.map((instance) => this.closeInstance(instance, false))
    );
    this.instances.clear();
  }

  private async closeInstance(instance: any, toast: boolean): Promise<void> {
    if (toast) {
      if (instance.closeWithAnimation) {
        await instance.closeWithAnimation();
        return;
      }
      await instance.exit();
      return;
    }

    if (instance.overlayClose) {
      await instance.overlayClose();
      return;
    }

    await instance.exit();
  }

  private trackInstance(instance: any): void {
    if (this.instances.has(instance)) {
      return;
    }
    this.instances.add(instance);
    const originalExit = instance.exit?.bind(instance);
    if (originalExit) {
      instance.exit = async (...args: any[]) => {
        this.instances.delete(instance);
        return originalExit(...args);
      };
    }
  }

  private getMountTarget(options: ConfirmOptions): HTMLElement {
    if (options.toast) {
      const stack = document.querySelector('.toast-stack--items') as HTMLElement;
      return stack || document.body;
    }

    return document.body;
  }
}
