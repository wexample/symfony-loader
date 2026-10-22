import AppService from '../Class/AppService';
import {
  keyboardShortcutMatches,
  keyboardShortcutParse,
  type KeyboardShortcut,
} from '@wexample/js-helpers/Helper/Keyboard';

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
  public static readonly KEY_ESCAPE: string = 'Escape';
  public static readonly KEY_ENTER: string = 'Enter';
  public static readonly KEY_TAB: string = 'Tab';
  public static readonly KEY_ARROW_UP: string = 'ArrowUp';
  public static readonly KEY_ARROW_DOWN: string = 'ArrowDown';
  public static readonly KEY_ARROW_LEFT: string = 'ArrowLeft';
  public static readonly KEY_ARROW_RIGHT: string = 'ArrowRight';
  public static readonly KEY_HOME: string = 'Home';
  public static readonly KEY_END: string = 'End';

  private listenersByKey: Map<string, KeyboardListener[]> = new Map();
  private shortcutListeners: (KeyboardListener & { shortcut: KeyboardShortcut })[] = [];
  private registrationOrder: number = 0;

  private onKeyDown = (event: KeyboardEvent) => {
    // A shortcut first — `Mod+S`, whatever the platform calls Mod —, then the
    // listeners of the key alone.
    const shortcuts = this.shortcutListeners.filter((listener) => keyboardShortcutMatches(event, listener.shortcut));

    if (shortcuts.length && this.dispatch(event, shortcuts)) {
      return;
    }

    const keyListeners = this.listenersByKey.get(event.key) || [];
    if (!keyListeners.length) {
      return;
    }

    this.dispatch(event, keyListeners);
  };

  // To the listeners in their order — the highest priority, then the last
  // registered —, until one handles it. Whether one did.
  private dispatch(event: KeyboardEvent, candidates: KeyboardListener[]): boolean {
    const listeners = [...candidates].sort((a, b) => {
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
        return true;
      }
    }

    return false;
  }

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

  /**
   * A combination rather than a key: `Mod+S`, `Mod+Shift+Z`, `Alt+ArrowUp`.
   * `Mod` is ⌘ on a Mac and Ctrl elsewhere — the one key to write for what
   * both platforms do with their own. The modifiers must be those, no more.
   */
  registerShortcut(
    owner: any,
    combo: string,
    callback: (event: KeyboardEvent) => any,
    options: KeyboardListenerOptions = {}
  ): void {
    this.shortcutListeners.push({
      owner,
      callback,
      shortcut: keyboardShortcutParse(combo),
      options: {
        priority: options.priority ?? 0,
        preventDefault: options.preventDefault ?? false,
        stopPropagation: options.stopPropagation ?? false,
        enabled: options.enabled ?? (() => true)
      },
      order: ++this.registrationOrder
    });
  }

  unregisterOwner(owner: any): void {
    this.shortcutListeners = this.shortcutListeners.filter((listener) => listener.owner !== owner);

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
