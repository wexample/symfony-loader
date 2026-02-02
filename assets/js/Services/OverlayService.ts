import AppService from '../Class/AppService';
import { objectCallPrototypeMethodIfExists } from '@wexample/js-helpers/Helper/Object';

export default class OverlayService extends AppService {
  public static serviceName: string = 'overlay';

  private activeOverlay: any = null;
  private previousFocusedEl: HTMLElement | null = null;
  private registered = new Set<any>();

  private onDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }

    const overlay = this.getActiveOverlay();
    if (!overlay || !overlay.overlayIsOpen?.()) {
      return;
    }

    event.preventDefault();

    if (overlay.overlayOnEscape) {
      overlay.overlayOnEscape(event);
    } else if (overlay.overlayClose) {
      overlay.overlayClose();
    }
  };

  private onDocumentMouseDown = (event: MouseEvent) => {
    const overlay = this.getActiveOverlay();
    if (!overlay || !overlay.overlayIsOpen?.()) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    const overlayEl = overlay.overlayGetElement?.() || overlay.el;
    if (overlayEl && overlayEl.contains(target)) {
      return;
    }

    if (overlay.overlayOnClickOutside) {
      overlay.overlayOnClickOutside(event);
    } else if (overlay.overlayClose) {
      overlay.overlayClose();
    }
  };

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          document.addEventListener('keydown', this.onDocumentKeydown);
          document.addEventListener('mousedown', this.onDocumentMouseDown);
        }
      }
    };
  }

  registerMethods(object: any, group: string) {
    const methods = {
      renderNode: {
        overlayIsEnabled(): boolean {
          return this.overlayEnabled === true || this.options?.overlayEnabled === true;
        },

        overlayIsOpen(): boolean {
          return !!this.el && this.el.classList.contains('is-open');
        },

        overlayGetElement(): HTMLElement {
          return this.el;
        },

        overlayGetFocusTarget(): HTMLElement | null {
          return null;
        },

        overlayOnOpen(): void {
        },

        overlayOnClose(): void {
        },

        overlayOnEscape(): void {
          this.overlayClose();
        },

        overlayOnClickOutside(): void {
          this.overlayClose();
        },

        overlayOpen(event?: Event): void {
          if (this.overlayIsOpen()) {
            return;
          }

          this.el.classList.add('is-open');
          this.app.services.overlay.setActive(this);
          this.overlayOnOpen?.(event);
        },

        overlayClose(event?: Event): void {
          if (!this.overlayIsOpen()) {
            return;
          }

          this.el.classList.remove('is-open');
          this.overlayOnClose?.(event);
          this.app.services.overlay.clearActive(this);
        },

        overlayToggle(event?: Event): void {
          if (this.overlayIsOpen()) {
            this.overlayClose(event);
          } else {
            this.overlayOpen(event);
          }
        },

        activateListeners(...args) {
          objectCallPrototypeMethodIfExists(this, 'activateListeners', args);

          if (this.overlayIsEnabled()) {
            this.app.services.overlay.register(this);
          }
        },

        deactivateListeners(...args) {
          objectCallPrototypeMethodIfExists(this, 'deactivateListeners', args);

          if (this.overlayIsEnabled()) {
            this.app.services.overlay.unregister(this);
          }
        }
      }
    };

    return methods;
  }

  register(overlay: any): void {
    this.registered.add(overlay);
  }

  unregister(overlay: any): void {
    this.registered.delete(overlay);

    if (this.activeOverlay === overlay) {
      this.clearActive(overlay);
    }
  }

  setActive(overlay: any): void {
    if (this.activeOverlay && this.activeOverlay !== overlay) {
      if (this.activeOverlay.overlayIsOpen?.() && this.activeOverlay.overlayClose) {
        this.activeOverlay.overlayClose();
      }
    }

    this.activeOverlay = overlay;

    if (!this.previousFocusedEl) {
      this.previousFocusedEl = document.activeElement as HTMLElement;
    }

    const focusTarget = overlay.overlayGetFocusTarget?.();
    if (focusTarget) {
      focusTarget.focus();
    }
  }

  clearActive(overlay: any): void {
    if (this.activeOverlay !== overlay) {
      return;
    }

    this.activeOverlay = null;

    if (this.previousFocusedEl) {
      this.previousFocusedEl.focus();
      this.previousFocusedEl = null;
    }
  }

  getActiveOverlay(): any {
    return this.activeOverlay;
  }
}
