import AppService from '../Class/AppService';
import ConnectionStatusService from './ConnectionStatusService';
import EventsService from './EventsService';
import RoutingService from './RoutingService';
import MercureLiveUpdatesDriver, {
  type MercureDriverConfig,
  type MercureDriverConfigResolver,
} from '@wexample/js-api/Common/LiveUpdates/MercureLiveUpdatesDriver';
import LiveSubscriberInfoResolver, {
  type LiveSubscriberInfo,
} from '@wexample/js-api/Common/LiveUpdates/LiveSubscriberInfoResolver';
import ApiLiveUpdatesConnection, {
  type LiveUpdatesConnectionStatus as ApiLiveUpdatesConnectionStatus,
} from '@wexample/js-api/Common/LiveUpdates/LiveUpdatesConnection';
import type { LiveUpdatesDriverInterface } from '@wexample/js-api/Common/LiveUpdates/LiveUpdatesDriver';
import InvariantViolationError from '../Errors/InvariantViolationError';
import {
  type ReconnectBackoffOptions,
} from '@wexample/js-helpers/Helper/Reconnect';
import type { RetryBackoffScheduleContext } from '@wexample/js-helpers/Common/RetryBackoffScheduler';

export type { LiveUpdatesDriverInterface };

export class LiveUpdatesServiceEvents {
  public static CONNECTION_CREATED: string = 'live-updates:connection-created';
  public static CONNECTION_STATUS_CHANGED: string = 'live-updates:connection-status-changed';
  public static CONNECTION_MESSAGE: string = 'live-updates:connection-message';
  public static CONNECTION_CLOSED: string = 'live-updates:connection-closed';
  public static CONNECTION_RECONNECTING: string = 'live-updates:connection-reconnecting';
  public static CONNECTION_RECONNECTED: string = 'live-updates:connection-reconnected';
  public static CONNECTION_RECONNECT_STOPPED: string = 'live-updates:connection-reconnect-stopped';
  public static STATUS_CHANGED: string = 'live-updates:status-changed';
}

export type LiveUpdatesConnectionStatus = 'connecting' | 'open' | 'error' | 'closed';

// A retry is a connection attempt as far as this service is concerned, and a
// give-up leaves the connection down: the finer states stay inside js-api.
const CONNECTION_STATUS_MAP: Record<ApiLiveUpdatesConnectionStatus, LiveUpdatesConnectionStatus> = {
  connecting: 'connecting',
  open: 'open',
  error: 'error',
  reconnecting: 'connecting',
  'reconnect-stopped': 'error',
  closed: 'closed',
};

export type LiveUpdatesStatus = {
  total: number;
  connecting: number;
  open: number;
  error: number;
  hasActiveConnection: boolean;
};

export type LiveUpdatesConnectOptions = {
  topics: string | string[];
  // A connection carrying its own driver: what subscribing to a single entity
  // needs, its token being delivered for that entity and no other.
  driver?: LiveUpdatesDriverInterface;
  owner?: object;
  metadata?: Record<string, unknown>;
  onOpen?: (connection: LiveUpdatesConnection) => void;
  onError?: (connection: LiveUpdatesConnection) => void;
  onMessage?: (connection: LiveUpdatesConnection, payload: unknown, event: MessageEvent) => void;
};

export type LiveUpdatesEntityConnectOptions = Omit<LiveUpdatesConnectOptions, 'topics' | 'driver'> & {
  entityName: string;
  id: string;
};

export type LiveUpdatesConnection = {
  id: string;
  topics: string[];
  owner?: object;
  metadata: Record<string, unknown>;
  status: LiveUpdatesConnectionStatus;
  close: () => void;
};

type LiveUpdatesConnectionInternal = LiveUpdatesConnection & {
  // Null between the record being registered and the stream being opened: opening
  // may already call back into the status handlers.
  apiConnection: ApiLiveUpdatesConnection | null;
  onOpen?: (connection: LiveUpdatesConnection) => void;
  onError?: (connection: LiveUpdatesConnection) => void;
  onMessage?: (connection: LiveUpdatesConnection, payload: unknown, event: MessageEvent) => void;
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

export type RenderNodeLiveUpdatesType = {
  liveUpdatesConnect(
    options: Omit<LiveUpdatesConnectOptions, 'owner'>
  ): LiveUpdatesConnection;
  liveUpdatesConnectToEntity(
    options: Omit<LiveUpdatesEntityConnectOptions, 'owner'>
  ): Promise<LiveUpdatesConnection>;
  liveUpdatesDisconnect(
    connection?: string | LiveUpdatesConnection
  ): boolean | number;
  liveUpdatesHasConnection(): boolean;
  liveUpdatesStatus(): LiveUpdatesStatus;
};

// The route symfony-live serves subscriber tokens on.
const SUBSCRIBE_INFO_ROUTE = 'wexample_symfony_live_subscribe_info';

export default class LiveUpdatesService extends AppService {
  public static serviceName: string = 'liveUpdates';
  public static dependencies: typeof AppService[] = [EventsService, ConnectionStatusService, RoutingService];

  private readonly connections: Map<string, LiveUpdatesConnectionInternal> = new Map();
  // One resolver per entity, so two components watching the same thing share a
  // token instead of each asking the server for one.
  private readonly subscriberResolvers: Map<string, LiveSubscriberInfoResolver> = new Map();
  private readonly ownerConnections: WeakMap<object, Set<string>> = new WeakMap();
  private reconnectOptions: ReconnectBackoffOptions = {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    factor: 2,
    jitterRatio: 0.2,
  };
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

        liveUpdatesConnectToEntity(options: Omit<LiveUpdatesEntityConnectOptions, 'owner'>) {
          return this.app.services.liveUpdates.connectToEntity({
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

  setReconnectOptions(options: ReconnectBackoffOptions): void {
    this.reconnectOptions = {
      ...this.reconnectOptions,
      ...options,
    };
  }

  // An async resolver is what lets a reconnection carry a token the first connection
  // did not have — see LiveSubscriberInfoResolver in js-api.
  useMercureDriver(config: MercureDriverConfig | MercureDriverConfigResolver): void {
    this.setDriver(new MercureLiveUpdatesDriver(config));
  }

  useMercureDriverFromLayoutVars(config: MercureLayoutVarsConfig): void {
    this.useMercureDriver(() => {
      const vars = this.app?.layout?.vars || {};
      const hubUrl = this.readFirstLayoutVar(vars, config.hubUrlVars);
      const jwt = this.readFirstLayoutVar(vars, config.jwtVars || []);

      if (!hubUrl) {
        throw new InvariantViolationError({
          message: `Missing Mercure hub url in layout vars. Checked: ${config.hubUrlVars.join(', ')}`,
          code: 'ERR_LIVE_UPDATES_MERCURE_URL_MISSING',
          context: {
            checkedVars: [...config.hubUrlVars],
          },
        });
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
    const driver = options.driver ?? this.driver;

    if (!driver) {
      throw new InvariantViolationError({
        message: 'Live updates driver is missing. Call setDriver() before connect().',
        code: 'ERR_LIVE_UPDATES_DRIVER_MISSING',
      });
    }

    const topics = this.normalizeTopics(options.topics);
    const id = `live-updates-${++this.connectionIndex}`;

    const connection: LiveUpdatesConnectionInternal = {
      id,
      topics,
      apiConnection: null,
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

    this.connections.set(id, connection);
    this.trackOwnerConnection(connection);

    connection.apiConnection = new ApiLiveUpdatesConnection({
      driver,
      topics,
      reconnect: this.reconnectOptions,
      onMessage: (payload, event) => {
        this.handleMessage(connection, payload, event);
      },
      onStatusChange: (status, previousStatus) => {
        this.handleStatusChange(connection, status, previousStatus);
      },
      onReconnectScheduled: (context) => {
        this.handleReconnectScheduled(connection, context);
      },
    });

    this.emit(LiveUpdatesServiceEvents.CONNECTION_CREATED, connection);
    this.emitStatus(connection);

    return this.toPublicConnection(connection);
  }

  // The caller names an entity and never a topic: the topics come back from the
  // server, which is what keeps a subscription and its publications together.
  async connectToEntity(options: LiveUpdatesEntityConnectOptions): Promise<LiveUpdatesConnection> {
    const { entityName, id, ...connectOptions } = options;
    const resolver = this.getSubscriberInfoResolver(entityName, id);
    const info = await resolver.resolve();

    return this.connect({
      ...connectOptions,
      topics: info.topics,
      driver: new MercureLiveUpdatesDriver(async () => {
        const current = await resolver.resolve();

        return {
          hubUrl: current.hubUrl,
          jwt: current.jwt,
        };
      }),
    });
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
      throw new InvariantViolationError({
        message: 'Unable to build topic from empty parts.',
        code: 'ERR_LIVE_UPDATES_TOPIC_EMPTY_PARTS',
      });
    }

    return normalized.join('/');
  }

  private getSubscriberInfoResolver(entityName: string, id: string): LiveSubscriberInfoResolver {
    const key = `${entityName}/${id}`;
    let resolver = this.subscriberResolvers.get(key);

    if (!resolver) {
      resolver = new LiveSubscriberInfoResolver({
        fetchInfo: () => this.fetchSubscriberInfo(entityName, id),
      });

      this.subscriberResolvers.set(key, resolver);
    }

    return resolver;
  }

  private async fetchSubscriberInfo(entityName: string, id: string): Promise<LiveSubscriberInfo> {
    const response = await fetch(
      this.getRoutingService().path(SUBSCRIBE_INFO_ROUTE, { entityName, id }),
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      throw new InvariantViolationError({
        message: `Unable to subscribe to ${entityName} ${id}: the server answered ${response.status}.`,
        code: 'ERR_LIVE_UPDATES_SUBSCRIBE_INFO_FAILED',
        context: { entityName, id, status: response.status },
      });
    }

    return response.json();
  }

  private getRoutingService(): RoutingService {
    return this.app.getServiceOrFail(RoutingService) as RoutingService;
  }

  private normalizeTopics(topics: string | string[]): string[] {
    const normalized = Array.isArray(topics) ? topics : [topics];
    const filtered = normalized
      .map((topic) => topic?.trim())
      .filter((topic) => !!topic);

    if (!filtered.length) {
      throw new InvariantViolationError({
        message: 'At least one topic is required for live updates.',
        code: 'ERR_LIVE_UPDATES_TOPIC_REQUIRED',
      });
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

  private handleMessage(
    connection: LiveUpdatesConnectionInternal,
    payload: unknown,
    event: MessageEvent
  ): void {
    this.emit(LiveUpdatesServiceEvents.CONNECTION_MESSAGE, {
      connection: this.toPublicConnection(connection),
      event,
      payload,
    });

    connection.onMessage?.(this.toPublicConnection(connection), payload, event);
  }

  private handleStatusChange(
    connection: LiveUpdatesConnectionInternal,
    status: ApiLiveUpdatesConnectionStatus,
    previousStatus: ApiLiveUpdatesConnectionStatus
  ): void {
    if (status === 'open') {
      this.markConnectionOnline(connection);
    } else if (status === 'error') {
      this.markConnectionOffline(connection, {
        reason: 'source-error',
      });
    }

    this.updateConnectionStatus(connection, CONNECTION_STATUS_MAP[status]);

    // A reconnection succeeding is not a state of its own: it is the stream
    // reopening from a retry.
    if (status === 'open' && previousStatus === 'reconnecting') {
      this.emit(LiveUpdatesServiceEvents.CONNECTION_RECONNECTED, {
        connection: this.toPublicConnection(connection),
      });
    }

    if (status === 'reconnect-stopped') {
      this.emit(LiveUpdatesServiceEvents.CONNECTION_RECONNECT_STOPPED, {
        connection: this.toPublicConnection(connection),
      });
    }

    if (status === 'open') {
      connection.onOpen?.(this.toPublicConnection(connection));
    } else if (status === 'error') {
      connection.onError?.(this.toPublicConnection(connection));
    }
  }

  private handleReconnectScheduled(
    connection: LiveUpdatesConnectionInternal,
    context: RetryBackoffScheduleContext
  ): void {
    this.emit(LiveUpdatesServiceEvents.CONNECTION_RECONNECTING, {
      connection: this.toPublicConnection(connection),
      attempt: context.attempt,
      delayMs: context.delayMs,
    });
  }

  private updateConnectionStatus(
    connection: LiveUpdatesConnectionInternal,
    nextStatus: LiveUpdatesConnectionStatus
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
    });
    this.emitStatus(connection);
  }

  private emitStatus(connection?: LiveUpdatesConnectionInternal): void {
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

    connection.apiConnection?.close();
    this.markConnectionOnline(connection);

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
      metadata: { ...connection.metadata },
      status: connection.status,
      close: connection.close,
    };
  }

  private markConnectionOffline(
    connection: LiveUpdatesConnectionInternal,
    context: Record<string, unknown> = {}
  ): void {
    this.getConnectionStatusService().markSourceDisconnected(this.getConnectionStatusSource(connection), context);
  }

  private markConnectionOnline(connection: LiveUpdatesConnectionInternal): void {
    this.getConnectionStatusService().markSourceReconnected(this.getConnectionStatusSource(connection));
  }

  private getConnectionStatusSource(connection: LiveUpdatesConnectionInternal): string {
    return `live-updates:${connection.id}`;
  }

  private getConnectionStatusService(): ConnectionStatusService {
    return this.app.getServiceOrFail(ConnectionStatusService) as ConnectionStatusService;
  }
}
