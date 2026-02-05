import AppService from '../Class/AppService';

interface KeyboardListenerOptions {
  priority?: number;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: (event: KeyboardEvent) => boolean;
}

interface KeyboardListener {
  owner: any;
  callback: (event: KeyboardEvent) => any;
  options: Required<KeyboardListenerOptions>;
  order: number;
}

export default class KeyboardService extends AppService {
  public static serviceName: string = 'keyboard';

  private listenersByKey: Map<string, KeyboardListener[]> = new Map();
  private registrationOrder: number = 0;

  private onKeyDown = (event: KeyboardEvent) => {
    const keyListeners = this.listenersByKey.get(event.key) || [];
    if (!keyListeners.length) {
      return;
    }

    const listeners = [...keyListeners].sort((a, b) => {
      if (a.options.priority === b.options.priority) {
        return b.order - a.order;
      }

      return b.options.priority - a.options.priority;
    });

    for (const listener of listeners) {
      if (!listener.options.enabled(event)) {
        continue;
      }

      if (listener.options.preventDefault) {
        event.preventDefault();
      }

      if (listener.options.stopPropagation) {
        event.stopPropagation();
      }

      const handled = listener.callback(event);
      if (handled !== false) {
        break;
      }
    }
  };

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          document.addEventListener('keydown', this.onKeyDown);
        }
      }
    };
  }

  registerKeyDown(
    owner: any,
    key: string,
    callback: (event: KeyboardEvent) => any,
    options: KeyboardListenerOptions = {}
  ): void {
    const listeners = this.listenersByKey.get(key) || [];

    listeners.push({
      owner,
      callback,
      options: {
        priority: options.priority ?? 0,
        preventDefault: options.preventDefault ?? false,
        stopPropagation: options.stopPropagation ?? false,
        enabled: options.enabled ?? (() => true)
      },
      order: ++this.registrationOrder
    });

    this.listenersByKey.set(key, listeners);
  }

  unregisterOwner(owner: any): void {
    this.listenersByKey.forEach((listeners, key) => {
      const filtered = listeners.filter((listener) => listener.owner !== owner);
      if (filtered.length) {
        this.listenersByKey.set(key, filtered);
      } else {
        this.listenersByKey.delete(key);
      }
    });
  }
}
