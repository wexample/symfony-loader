import AppService from '../Class/AppService';

export default class OverlayService extends AppService {
  public static serviceName: string = 'overlay';

  private activeOverlay: any = null;
  private previousFocusedEl: HTMLElement | null = null;
  private registered = new Set<any>();

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
          document.addEventListener('mousedown', this.onDocumentMouseDown);
        }
      }
    };
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
