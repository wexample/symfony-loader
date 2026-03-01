import AppService from '../Class/AppService';
import EventsService from './EventsService';

export class LiveUpdatesServiceEvents {
  public static CONNECTION_CREATED: string = 'live-updates:connection-created';
  public static CONNECTION_STATUS_CHANGED: string = 'live-updates:connection-status-changed';
  public static CONNECTION_MESSAGE: string = 'live-updates:connection-message';
  public static CONNECTION_CLOSED: string = 'live-updates:connection-closed';
  public static STATUS_CHANGED: string = 'live-updates:status-changed';
}

export type LiveUpdatesConnectionStatus = 'connecting' | 'open' | 'error' | 'closed';

export type LiveUpdatesStatus = {
  total: number;
  connecting: number;
  open: number;
  error: number;
  hasActiveConnection: boolean;
};

export type LiveUpdatesConnectOptions = {
  topics: string | string[];
  owner?: object;
  metadata?: Record<string, unknown>;
  onOpen?: (connection: LiveUpdatesConnection, event: Event) => void;
  onError?: (connection: LiveUpdatesConnection, event: Event) => void;
  onMessage?: (connection: LiveUpdatesConnection, payload: unknown, event: MessageEvent) => void;
};

export type LiveUpdatesConnection = {
  id: string;
  topics: string[];
  owner?: object;
  metadata: Record<string, unknown>;
  status: LiveUpdatesConnectionStatus;
  source: EventSource;
  close: () => void;
};

type LiveUpdatesConnectionInternal = LiveUpdatesConnection & {
  onOpen?: (connection: LiveUpdatesConnection, event: Event) => void;
  onError?: (connection: LiveUpdatesConnection, event: Event) => void;
  onMessage?: (connection: LiveUpdatesConnection, payload: unknown, event: MessageEvent) => void;
};

export interface LiveUpdatesDriverInterface {
  connect(options: LiveUpdatesConnectOptions & { topics: string[] }): EventSource;
}

export type MercureDriverConfig = {
  hubUrl: string;
  jwt?: string | null;
  hubPath?: string;
  topicParamName?: string;
  jwtParamName?: string;
  withCredentials?: boolean;
  additionalParams?: Record<string, string | number | boolean>;
};

export type MercureLayoutVarsConfig = {
  hubUrlVars: string[];
  jwtVars?: string[];
  hubPath?: string;
  topicParamName?: string;
  jwtParamName?: string;
  withCredentials?: boolean;
  additionalParams?: Record<string, string | number | boolean>;
};

export class MercureLiveUpdatesDriver implements LiveUpdatesDriverInterface {
  private readonly configResolver: () => MercureDriverConfig;

  constructor(config: MercureDriverConfig | (() => MercureDriverConfig)) {
    this.configResolver = typeof config === 'function' ? config : () => config;
  }

  connect(options: LiveUpdatesConnectOptions & { topics: string[] }): EventSource {
    const config = this.configResolver();
    const hubPath = config.hubPath ?? '/.well-known/mercure';
    const topicParamName = config.topicParamName ?? 'topic';
    const jwtParamName = config.jwtParamName ?? 'jwt';
    const withCredentials = config.withCredentials ?? true;

    if (!config.hubUrl) {
      throw new Error('Mercure hubUrl is required.');
    }

    const url = new URL(hubPath, config.hubUrl);

    options.topics.forEach((topic) => {
      url.searchParams.append(topicParamName, topic);
    });

    if (config.jwt) {
      url.searchParams.append(jwtParamName, config.jwt);
    }

    Object.entries(config.additionalParams || {}).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return new EventSource(url.toString(), {
      withCredentials,
    });
  }
}

export default class LiveUpdatesService extends AppService {
  public static serviceName: string = 'liveUpdates';
  public static dependencies: typeof AppService[] = [EventsService];

  private readonly connections: Map<string, LiveUpdatesConnectionInternal> = new Map();
  private readonly ownerConnections: WeakMap<object, Set<string>> = new WeakMap();
  private connectionIndex: number = 0;
  private driver: LiveUpdatesDriverInterface | null = null;

  registerHooks() {
    return {
      app: {
        hookLoadLayoutRenderData: () => {
          const appWithFactory = this.app as unknown as {
            createLiveUpdatesDriver?: () => LiveUpdatesDriverInterface;
          };
          if (!this.driver && typeof appWithFactory.createLiveUpdatesDriver === 'function') {
            this.setDriver(appWithFactory.createLiveUpdatesDriver());
          }
        },
      },

      renderNode: {
        hookUnmounted: (renderNode: object) => {
          this.disconnectOwner(renderNode);
        },
      },
    };
  }

  registerMethods() {
    return {
      renderNode: {
        liveUpdatesConnect(options: Omit<LiveUpdatesConnectOptions, 'owner'>) {
          return this.app.services.liveUpdates.connect({
            ...options,
            owner: this,
          });
        },

        liveUpdatesDisconnect(connection?: string | LiveUpdatesConnection) {
          if (connection) {
            return this.app.services.liveUpdates.disconnect(connection);
          }

          return this.app.services.liveUpdates.disconnectOwner(this);
        },

        liveUpdatesHasConnection() {
          return this.app.services.liveUpdates.hasConnectionForOwner(this);
        },

        liveUpdatesStatus() {
          return this.app.services.liveUpdates.getStatus();
        },

        liveUpdatesTopic(...parts: Array<string | number>) {
          return this.app.services.liveUpdates.topic(...parts);
        },
      },
    };
  }

  setDriver(driver: LiveUpdatesDriverInterface): void {
    this.driver = driver;
  }

  useMercureDriver(config: MercureDriverConfig | (() => MercureDriverConfig)): void {
    this.setDriver(new MercureLiveUpdatesDriver(config));
  }

  useMercureDriverFromLayoutVars(config: MercureLayoutVarsConfig): void {
    this.useMercureDriver(() => {
      const vars = this.app?.layout?.vars || {};
      const hubUrl = this.readFirstLayoutVar(vars, config.hubUrlVars);
      const jwt = this.readFirstLayoutVar(vars, config.jwtVars || []);

      if (!hubUrl) {
        throw new Error(
          `Missing Mercure hub url in layout vars. Checked: ${config.hubUrlVars.join(', ')}`
        );
      }

      return {
        hubUrl,
        jwt: jwt || null,
        hubPath: config.hubPath,
        topicParamName: config.topicParamName,
        jwtParamName: config.jwtParamName,
        withCredentials: config.withCredentials,
        additionalParams: config.additionalParams,
      };
    });
  }

  connect(options: LiveUpdatesConnectOptions): LiveUpdatesConnection {
    if (!this.driver) {
      throw new Error('Live updates driver is missing. Call setDriver() before connect().');
    }

    const topics = this.normalizeTopics(options.topics);
    const id = `live-updates-${++this.connectionIndex}`;
    const source = this.driver.connect({
      ...options,
      topics,
    });

    const connection: LiveUpdatesConnectionInternal = {
      id,
      topics,
      source,
      owner: options.owner,
      metadata: { ...(options.metadata || {}) },
      status: 'connecting',
      onOpen: options.onOpen,
      onError: options.onError,
      onMessage: options.onMessage,
      close: () => {
        this.disconnect(id);
      },
    };

    this.bindSource(connection);
    this.connections.set(id, connection);
    this.trackOwnerConnection(connection);

    this.emit(LiveUpdatesServiceEvents.CONNECTION_CREATED, connection);
    this.emitStatus(connection);

    return this.toPublicConnection(connection);
  }

  disconnect(connection: string | LiveUpdatesConnection): boolean {
    const id = typeof connection === 'string' ? connection : connection?.id;
    if (!id) {
      return false;
    }

    const existing = this.connections.get(id);
    if (!existing) {
      return false;
    }

    this.cleanupConnection(existing);

    return true;
  }

  disconnectOwner(owner: object): number {
    const trackedConnections = this.ownerConnections.get(owner);
    if (!trackedConnections || trackedConnections.size === 0) {
      return 0;
    }

    let disconnected = 0;
    Array.from(trackedConnections).forEach((connectionId) => {
      if (this.disconnect(connectionId)) {
        disconnected++;
      }
    });

    return disconnected;
  }

  hasConnectionForOwner(owner: object): boolean {
    const trackedConnections = this.ownerConnections.get(owner);
    return !!trackedConnections && trackedConnections.size > 0;
  }

  getStatus(): LiveUpdatesStatus {
    const status = {
      total: 0,
      connecting: 0,
      open: 0,
      error: 0,
      hasActiveConnection: false,
    };

    this.connections.forEach((connection) => {
      status.total += 1;
      if (connection.status === 'connecting') {
        status.connecting += 1;
      } else if (connection.status === 'open') {
        status.open += 1;
      } else if (connection.status === 'error') {
        status.error += 1;
      }
    });

    status.hasActiveConnection = status.open > 0 || status.connecting > 0;

    return status;
  }

  topic(...parts: Array<string | number>): string {
    const normalized = parts
      .map((part) => String(part).trim())
      .filter((part) => !!part);

    if (!normalized.length) {
      throw new Error('Unable to build topic from empty parts.');
    }

    return normalized.join('/');
  }

  private normalizeTopics(topics: string | string[]): string[] {
    const normalized = Array.isArray(topics) ? topics : [topics];
    const filtered = normalized
      .map((topic) => topic?.trim())
      .filter((topic) => !!topic);

    if (!filtered.length) {
      throw new Error('At least one topic is required for live updates.');
    }

    return filtered;
  }

  private readFirstLayoutVar(
    vars: Record<string, unknown>,
    keys: string[]
  ): string | undefined {
    for (const key of keys) {
      const value = vars[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }

    return undefined;
  }

  private bindSource(connection: LiveUpdatesConnectionInternal): void {
    connection.source.onopen = (event: Event) => {
      this.updateConnectionStatus(connection, 'open', event);
      connection.onOpen?.(this.toPublicConnection(connection), event);
    };

    connection.source.onerror = (event: Event) => {
      this.updateConnectionStatus(connection, 'error', event);
      connection.onError?.(this.toPublicConnection(connection), event);
    };

    connection.source.onmessage = (event: MessageEvent) => {
      const payload = this.parseMessageData(event.data);

      this.emit(LiveUpdatesServiceEvents.CONNECTION_MESSAGE, {
        connection: this.toPublicConnection(connection),
        event,
        payload,
      });

      connection.onMessage?.(this.toPublicConnection(connection), payload, event);
    };
  }

  private parseMessageData(data: unknown): unknown {
    if (typeof data !== 'string') {
      return data;
    }

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private updateConnectionStatus(
    connection: LiveUpdatesConnectionInternal,
    nextStatus: LiveUpdatesConnectionStatus,
    event?: Event
  ): void {
    if (connection.status === nextStatus) {
      return;
    }

    const previousStatus = connection.status;
    connection.status = nextStatus;

    this.emit(LiveUpdatesServiceEvents.CONNECTION_STATUS_CHANGED, {
      connection: this.toPublicConnection(connection),
      previousStatus,
      nextStatus,
      event,
    });
    this.emitStatus(connection);
  }

  private emitStatus(connection?: LiveUpdatesConnection): void {
    this.emit(LiveUpdatesServiceEvents.STATUS_CHANGED, {
      status: this.getStatus(),
      connection: connection ? this.toPublicConnection(connection) : undefined,
    });
  }

  private emit(eventName: string, detail: Record<string, unknown>): void {
    this.app.services.events.trigger(eventName, detail);
  }

  private cleanupConnection(connection: LiveUpdatesConnectionInternal): void {
    const previousStatus = connection.status;
    connection.status = 'closed';

    this.emit(LiveUpdatesServiceEvents.CONNECTION_STATUS_CHANGED, {
      connection: this.toPublicConnection(connection),
      previousStatus,
      nextStatus: 'closed',
    });

    connection.source.onopen = null;
    connection.source.onerror = null;
    connection.source.onmessage = null;
    connection.source.close();

    this.untrackOwnerConnection(connection);
    this.connections.delete(connection.id);

    this.emit(LiveUpdatesServiceEvents.CONNECTION_CLOSED, {
      connection: this.toPublicConnection({
        ...connection,
        status: 'closed',
      }),
    });
    this.emitStatus(connection);
  }

  private trackOwnerConnection(connection: LiveUpdatesConnectionInternal): void {
    if (!connection.owner) {
      return;
    }

    const existing = this.ownerConnections.get(connection.owner) || new Set<string>();
    existing.add(connection.id);
    this.ownerConnections.set(connection.owner, existing);
  }

  private untrackOwnerConnection(connection: LiveUpdatesConnectionInternal): void {
    if (!connection.owner) {
      return;
    }

    const existing = this.ownerConnections.get(connection.owner);
    if (!existing) {
      return;
    }

    existing.delete(connection.id);
    if (!existing.size) {
      this.ownerConnections.delete(connection.owner);
    }
  }

  private toPublicConnection(connection: LiveUpdatesConnectionInternal): LiveUpdatesConnection {
    return {
      id: connection.id,
      owner: connection.owner,
      topics: [...connection.topics],
      source: connection.source,
      metadata: { ...connection.metadata },
      status: connection.status,
      close: connection.close,
    };
  }
}
