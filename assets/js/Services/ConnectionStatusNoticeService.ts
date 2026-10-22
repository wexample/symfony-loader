import AppService from '../Class/AppService';
import App from '../Class/App';
import BannerService from './BannerService';
import ConnectionStatusService, {
  ConnectionStatusServiceEvents,
  type ConnectionStatus,
} from './ConnectionStatusService';
import EventsService from './EventsService';
import LocaleService from './LocaleService';

export type ConnectionStatusNoticeOptions = {
  offlineMessage?: string;
  onlineMessage?: string;
  onlineTimeout?: number;
  offlineSticky?: boolean;
  offlineType?: 'default' | 'success' | 'error' | 'warning' | 'info';
  onlineType?: 'default' | 'success' | 'error' | 'warning' | 'info';
  offlineClass?: string;
  onlineClass?: string;
};

const DEFAULT_OPTIONS: Required<ConnectionStatusNoticeOptions> = {
  offlineMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.connection_offline.message',
  onlineMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.connection_online.message',
  onlineTimeout: 3000,
  offlineSticky: true,
  offlineType: 'warning',
  onlineType: 'success',
  offlineClass: '',
  onlineClass: '',
};

export default class ConnectionStatusNoticeService extends AppService {
  public static serviceName: string = 'connectionStatusNotice';
  public static dependencies: typeof AppService[] = [
    EventsService,
    ConnectionStatusService,
    BannerService,
  ];

  private options: Required<ConnectionStatusNoticeOptions>;
  private offlineVisible: boolean = false;
  private statusChangedHandler: ((event: Event) => void) | null = null;

  constructor(app: App, options: ConnectionStatusNoticeOptions = {}) {
    super(app);
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  setOptions(options: ConnectionStatusNoticeOptions = {}): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.registerListeners();
        },
      },
    };
  }

  private registerListeners(): void {
    if (this.statusChangedHandler) {
      return;
    }

    const eventsService = this.app.getServiceOrFail(EventsService) as EventsService;

    this.statusChangedHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ status?: ConnectionStatus }>;
      const status = customEvent.detail?.status;
      if (!status) {
        return;
      }

      void this.handleStatusChanged(status);
    };

    eventsService.listen(ConnectionStatusServiceEvents.STATUS_CHANGED, this.statusChangedHandler);

    const connectionStatusService = this.app.getServiceOrFail(ConnectionStatusService) as ConnectionStatusService;
    void this.handleStatusChanged(connectionStatusService.getStatus());
  }

  private async handleStatusChanged(status: ConnectionStatus): Promise<void> {
    const bannerService = this.app.getServiceOrFail(BannerService) as BannerService;
    const localeService = this.app.getServiceOrFail(LocaleService) as LocaleService;

    if (!status.isOnline) {
      if (this.offlineVisible) {
        return;
      }

      this.offlineVisible = true;
      await bannerService.show({
        id: 'connection-status-offline',
        type: this.options.offlineType,
        message: localeService.trans(this.options.offlineMessage),
        sticky: this.options.offlineSticky,
        ...(this.options.offlineClass ? { class: this.options.offlineClass } : {}),
      });
      return;
    }

    if (!this.offlineVisible) {
      return;
    }

    this.offlineVisible = false;
    await bannerService.show({
      id: 'connection-status-online',
      type: this.options.onlineType,
      message: localeService.trans(this.options.onlineMessage),
      timeout: this.options.onlineTimeout,
      ...(this.options.onlineClass ? { class: this.options.onlineClass } : {}),
    });
  }
}
