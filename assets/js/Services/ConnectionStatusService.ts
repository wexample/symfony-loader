import AppService from '../Class/AppService';
import EventsService from './EventsService';

export class ConnectionStatusServiceEvents {
  public static STATUS_CHANGED: string = 'connection-status:status-changed';
  public static SOURCE_DISCONNECTED: string = 'connection-status:source-disconnected';
  public static SOURCE_RECONNECTED: string = 'connection-status:source-reconnected';
}

export type ConnectionStatus = {
  isOnline: boolean;
  browserOnline: boolean;
  disconnectedSources: string[];
};

export default class ConnectionStatusService extends AppService {
  public static serviceName: string = 'connectionStatus';
  public static dependencies: typeof AppService[] = [EventsService];

  private readonly disconnectedSources: Map<string, Record<string, unknown>> = new Map();
  private browserOnlineHandler: (() => void) | null = null;
  private browserOfflineHandler: (() => void) | null = null;

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.registerBrowserListeners();
        },
      },
    };
  }

  markSourceDisconnected(source: string, context: Record<string, unknown> = {}): void {
    if (!source) {
      return;
    }

    const wasOnline = this.isOnline();
    this.disconnectedSources.set(source, context);

    this.emit(ConnectionStatusServiceEvents.SOURCE_DISCONNECTED, {
      source,
      context,
      status: this.getStatus(),
    });

    this.emitStatusIfChanged(wasOnline);
  }

  markSourceReconnected(source: string): void {
    if (!source || !this.disconnectedSources.has(source)) {
      return;
    }

    const wasOnline = this.isOnline();
    this.disconnectedSources.delete(source);

    this.emit(ConnectionStatusServiceEvents.SOURCE_RECONNECTED, {
      source,
      status: this.getStatus(),
    });

    this.emitStatusIfChanged(wasOnline);
  }

  isOnline(): boolean {
    return this.disconnectedSources.size === 0;
  }

  getStatus(): ConnectionStatus {
    return {
      isOnline: this.isOnline(),
      browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      disconnectedSources: Array.from(this.disconnectedSources.keys()),
    };
  }

  private registerBrowserListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const eventsService = this.app.getServiceOrFail(EventsService) as EventsService;

    if (!this.browserOnlineHandler) {
      this.browserOnlineHandler = () => {
        this.markSourceReconnected('browser');
      };
      eventsService.listen('online', this.browserOnlineHandler, window);
    }

    if (!this.browserOfflineHandler) {
      this.browserOfflineHandler = () => {
        this.markSourceDisconnected('browser', {
          reason: 'navigator-offline-event',
        });
      };
      eventsService.listen('offline', this.browserOfflineHandler, window);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.markSourceDisconnected('browser', {
        reason: 'navigator-offline-state',
      });
    }
  }

  private emitStatusIfChanged(previousIsOnline: boolean): void {
    const nextStatus = this.getStatus();
    if (previousIsOnline === nextStatus.isOnline) {
      return;
    }

    this.emit(ConnectionStatusServiceEvents.STATUS_CHANGED, {
      status: nextStatus,
    });
  }

  private emit(eventName: string, detail: Record<string, unknown>): void {
    this.app.services.events.trigger(eventName, detail);
  }
}
