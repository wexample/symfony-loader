import AppService from '../Class/AppService';
import EventsService from './EventsService';
import ConnectionStatusService, { ConnectionStatusServiceEvents } from './ConnectionStatusService';

/**
 * What is read again on a clock, where the server has nothing to push — a
 * page of figures, a run that goes on — and the page chose to poll: a choice
 * made where the page is designed, never a fallback of the live updates.
 *
 * Every poll of the page goes through here, so that each one behaves the same
 * whoever wrote it:
 *
 * - it belongs to an owner — a component — and stops with it (`stopOwner`);
 * - a source read by several owners under one `key` is read once, each told;
 * - a page nobody looks at is not read: hidden, or offline, the poll waits,
 *   and reads at once when the page is seen again or the connection is back;
 * - a reading that fails waits longer before the next — twice, up to
 *   `MAX_BACKOFF` times the interval —, the interval coming back on success;
 * - it stops by itself once what it waited for is there (`until`).
 */

export type PollingStartOptions<T = unknown> = {
  // What is read: its answer handed to every owner of the poll.
  read: () => Promise<T> | T;
  // How long between two readings, at best.
  intervalMs: number;
  // Whom the poll belongs to: stopped with it.
  owner: object;
  // A source several owners read: read once for all of them.
  key?: string;
  // What each owner does with the answer.
  onResult?: (result: T) => void;
  // Whether the answer is the last one waited for: the poll stops.
  until?: (result: T) => boolean;
  // Read at once rather than after a first interval.
  immediate?: boolean;
};

export type PollingHandle = {
  // Read now, the clock starting again from there.
  refresh: () => Promise<void>;
  // This owner stops; the poll with it when it was the last.
  stop: () => void;
};

type Subscriber = {
  owner: object;
  onResult?: (result: unknown) => void;
  until?: (result: unknown) => boolean;
};

type Poll = {
  key: string;
  read: () => Promise<unknown> | unknown;
  intervalMs: number;
  subscribers: Set<Subscriber>;
  timer: number | null;
  failures: number;
  reading: boolean;
  // A reading skipped while nobody could see it, done when they can again.
  missed: boolean;
};

// How much longer a failing poll waits, at most, than its interval.
const MAX_BACKOFF = 8;

export default class PollingService extends AppService {
  public static serviceName: string = 'polling';
  public static dependencies: typeof AppService[] = [EventsService];

  private readonly polls: Map<string, Poll> = new Map();
  private anonymous = 0;

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.registerListeners();
        },
      },
    };
  }

  start<T>(options: PollingStartOptions<T>): PollingHandle {
    const key = options.key ?? `poll-${++this.anonymous}`;
    const subscriber: Subscriber = {
      owner: options.owner,
      onResult: options.onResult as Subscriber['onResult'],
      until: options.until as Subscriber['until'],
    };
    let poll = this.polls.get(key);

    if (poll) {
      // The source already read for another owner: this one is told too,
      // as often as the most impatient of them asks.
      poll.intervalMs = Math.min(poll.intervalMs, options.intervalMs);
    } else {
      poll = {
        key,
        read: options.read,
        intervalMs: options.intervalMs,
        subscribers: new Set(),
        timer: null,
        failures: 0,
        reading: false,
        missed: false,
      };
      this.polls.set(key, poll);
    }

    poll.subscribers.add(subscriber);

    if (options.immediate) {
      void this.tick(poll);
    } else if (poll.timer === null) {
      this.schedule(poll);
    }

    const current = poll;

    return {
      refresh: () => this.tick(current),
      stop: () => this.unsubscribe(current, subscriber),
    };
  }

  // Every poll of an owner stopped: what a component calls when it goes.
  stopOwner(owner: object): void {
    this.polls.forEach((poll) => {
      poll.subscribers.forEach((subscriber) => {
        if (subscriber.owner === owner) {
          this.unsubscribe(poll, subscriber);
        }
      });
    });
  }

  private unsubscribe(poll: Poll, subscriber: Subscriber): void {
    poll.subscribers.delete(subscriber);

    if (!poll.subscribers.size) {
      this.end(poll);
    }
  }

  private end(poll: Poll): void {
    if (poll.timer !== null) {
      window.clearTimeout(poll.timer);
    }

    poll.timer = null;
    this.polls.delete(poll.key);
  }

  private schedule(poll: Poll): void {
    if (poll.timer !== null) {
      window.clearTimeout(poll.timer);
    }

    const backoff = Math.min(2 ** poll.failures, MAX_BACKOFF);

    poll.timer = window.setTimeout(() => {
      poll.timer = null;
      void this.tick(poll);
    }, poll.intervalMs * backoff);
  }

  private canRead(): boolean {
    if (typeof document !== 'undefined' && document.hidden) {
      return false;
    }

    const connection = this.app.services[ConnectionStatusService.serviceName] as ConnectionStatusService | undefined;

    return connection ? connection.isOnline() : true;
  }

  private async tick(poll: Poll): Promise<void> {
    if (!this.polls.has(poll.key) || poll.reading) {
      return;
    }

    // Nobody to read it to: kept for when somebody is.
    if (!this.canRead()) {
      poll.missed = true;
      this.schedule(poll);

      return;
    }

    poll.missed = false;
    poll.reading = true;

    try {
      const result = await poll.read();
      poll.failures = 0;

      Array.from(poll.subscribers).forEach((subscriber) => {
        subscriber.onResult?.(result);

        if (subscriber.until?.(result)) {
          this.unsubscribe(poll, subscriber);
        }
      });
    } catch (error) {
      poll.failures++;
      // eslint-disable-next-line no-console
      console.warn(`[polling] "${poll.key}" could not be read`, error);
    } finally {
      poll.reading = false;
    }

    if (this.polls.has(poll.key)) {
      this.schedule(poll);
    }
  }

  // Seen again, or back online: what was missed is read at once.
  private readMissed = (): void => {
    if (!this.canRead()) {
      return;
    }

    this.polls.forEach((poll) => {
      if (poll.missed) {
        void this.tick(poll);
      }
    });
  };

  private registerListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const events = this.app.getServiceOrFail(EventsService) as EventsService;
    events.listen('visibilitychange', this.readMissed, document);
    // The connection said back by whoever watches it — the browser, a live
    // source —, or by the browser alone where nothing does.
    events.listen(ConnectionStatusServiceEvents.STATUS_CHANGED, this.readMissed, document);
    events.listen('online', this.readMissed, window);
  }
}
