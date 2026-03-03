import AppService from '../Class/AppService';
import App from '../Class/App';
import BannerService from './BannerService';
import EventsService from './EventsService';
import LiveUpdatesService, { LiveUpdatesServiceEvents } from './LiveUpdatesService';
import LocaleService from "@wexample/symfony-loader/js/Services/LocaleService";

export type LiveUpdatesNoticeOptions = {
  reconnectingMessage?: string;
  reconnectedMessage?: string;
  reconnectedTimeout?: number;
  reconnectingSticky?: boolean;
  reconnectingType?: 'default' | 'success' | 'error' | 'warning' | 'info';
  reconnectedType?: 'default' | 'success' | 'error' | 'warning' | 'info';
  reconnectingClass?: string;
  reconnectedClass?: string;
};

const DEFAULT_OPTIONS: Required<LiveUpdatesNoticeOptions> = {
  reconnectingMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.live_update_reconnecting.message',
  reconnectedMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.live_update_reconnected.message',
  reconnectedTimeout: 3000,
  reconnectingSticky: true,
  reconnectingType: 'warning',
  reconnectedType: 'success',
  reconnectingClass: '',
  reconnectedClass: '',
};

export default class LiveUpdatesNoticeService extends AppService {
  public static serviceName: string = 'liveUpdatesNotice';
  public static dependencies: typeof AppService[] = [EventsService, LiveUpdatesService, BannerService];

  private options: Required<LiveUpdatesNoticeOptions>;
  private reconnectWarningVisible: boolean = false;
  private reconnectingHandler: ((event: Event) => void) | null = null;
  private reconnectedHandler: ((event: Event) => void) | null = null;

  constructor(app: App, options: LiveUpdatesNoticeOptions = {}) {
    super(app);
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  setOptions(options: LiveUpdatesNoticeOptions = {}): void {
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
    const eventsService = this.app.getServiceOrFail(EventsService) as EventsService;
    const bannerService = this.app.getServiceOrFail(BannerService) as BannerService;

    if (!this.reconnectingHandler) {
      this.reconnectingHandler = () => {
        if (this.reconnectWarningVisible) {
          return;
        }

        const localeService = (this.app.getService(LocaleService) as unknown as LocaleService);

        this.reconnectWarningVisible = true;
        void bannerService.show({
          id: 'live-updates-reconnecting',
          type: this.options.reconnectingType,
          message: localeService.trans(this.options.reconnectingMessage),
          sticky: this.options.reconnectingSticky,
          ...(this.options.reconnectingClass ? {class: this.options.reconnectingClass} : {}),
        });
      };
      eventsService.listen(
        LiveUpdatesServiceEvents.CONNECTION_RECONNECTING,
        this.reconnectingHandler
      );
    }

    if (!this.reconnectedHandler) {
      this.reconnectedHandler = () => {
        if (!this.reconnectWarningVisible) {
          return;
        }

        const localeService = (this.app.getService(LocaleService) as unknown as LocaleService);

        this.reconnectWarningVisible = false;
        void bannerService.show({
          id: 'live-updates-reconnected',
          type: this.options.reconnectedType,
          message: localeService.trans(this.options.reconnectedMessage),
          timeout: this.options.reconnectedTimeout,
          ...(this.options.reconnectedClass ? {class: this.options.reconnectedClass} : {}),
        });
      };
      eventsService.listen(
        LiveUpdatesServiceEvents.CONNECTION_RECONNECTED,
        this.reconnectedHandler
      );
    }
  }
}
