import AppService from '../Class/AppService';
import ComponentsService from './ComponentsService';

export const CONFIRM_RESPONSE_YES = 'yes';
export const CONFIRM_RESPONSE_NO = 'no';
export const CONFIRM_RESPONSE_OK = 'ok';
export const CONFIRM_RESPONSE_CANCEL = 'cancel';
export const CONFIRM_RESPONSE_YES_ALL = 'yes_all';
export const CONFIRM_RESPONSE_CONTINUE = 'continue';

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

interface ConfirmInstance {
  overlayOpen?: () => void;
  overlayClose?: () => Promise<void>;
  closeWithAnimation?: () => Promise<void>;
  exit?: (...args: unknown[]) => unknown;
}

export default class ConfirmService extends AppService {
  public static serviceName: string = 'confirm';
  private instances: Set<ConfirmInstance> = new Set();

  private presets: Record<ConfirmPreset, ConfirmAction[]> = {
    yes_no: [
      { key: 'y', value: CONFIRM_RESPONSE_YES, label: 'Yes', role: 'primary' },
      { key: 'n', value: CONFIRM_RESPONSE_NO, label: 'No', role: 'secondary' },
    ],
    ok_cancel: [
      { key: 'y', value: CONFIRM_RESPONSE_OK, label: 'Ok', role: 'primary' },
      { key: 'n', value: CONFIRM_RESPONSE_CANCEL, label: 'Cancel', role: 'secondary' },
    ],
    yes_no_all: [
      { key: 'y', value: CONFIRM_RESPONSE_YES, label: 'Yes', role: 'primary' },
      { key: 'Y', value: CONFIRM_RESPONSE_YES_ALL, label: 'Yes for all', role: 'secondary' },
      { key: 'n', value: CONFIRM_RESPONSE_NO, label: 'No', role: 'secondary' },
    ],
    continue_cancel: [
      { key: 'y', value: CONFIRM_RESPONSE_CONTINUE, label: 'Continue', role: 'primary' },
      { key: 'n', value: CONFIRM_RESPONSE_CANCEL, label: 'Cancel', role: 'secondary' },
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
    const service = this.app.getServiceOrFail(ComponentsService) as ComponentsService;
    const mountTarget = this.getMountTarget(options);
    let instance: ConfirmInstance | null = null;
    let resolveConfirm!: (value: string) => void;

    const confirmation = new Promise<string>((resolve) => {
      resolveConfirm = resolve;
    });

    const component = await Promise.resolve(
      service.createComponentFromTemplate(
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
            resolveConfirm(resolvedAction.value);
            if (instance && !resolvedAction.keepOpen) {
              await this.closeInstance(instance, options.toast);
            }
          },
        },
        this.app.layout,
        mountTarget
      )
    );

    if (!component) {
      resolveConfirm(CONFIRM_RESPONSE_CANCEL);
      return confirmation;
    }

    instance = component.instance as ConfirmInstance;
    this.trackInstance(instance);

    if (!options.toast && instance?.overlayOpen) {
      instance.overlayOpen();
    }

    return confirmation;
  }

  public async closeAll(): Promise<void> {
    const instances = Array.from(this.instances);
    await Promise.all(
      instances.map((instance) => this.closeInstance(instance, false))
    );
    this.instances.clear();
  }

  private async closeInstance(instance: ConfirmInstance, toast: boolean): Promise<void> {
    if (toast) {
      await instance.closeWithAnimation?.();
      return;
    }

    await instance.overlayClose?.();
  }

  private trackInstance(instance: ConfirmInstance): void {
    if (this.instances.has(instance)) {
      return;
    }
    this.instances.add(instance);
    const originalExit = instance.exit?.bind(instance);
    if (originalExit) {
      instance.exit = async (...args: unknown[]) => {
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
