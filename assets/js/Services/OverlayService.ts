import AppService from '../Class/AppService';

export default class OverlayService extends AppService {
  public static serviceName: string = 'overlay';

  private activeOverlay: any = null;
  private previousFocusedEl: HTMLElement | null = null;
  private registered = new Set<any>();
  private overlayStack: any[] = [];
  private overlayEl: HTMLElement | null = null;
  private baseZIndex: number = 1000;

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
          this.overlayEl = document.getElementById('overlay-layer');
          if (!this.overlayEl) {
            throw new Error('Missing overlay container "#overlay-layer".');
          }
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
    const currentIndex = this.overlayStack.indexOf(overlay);
    if (currentIndex !== -1) {
      this.overlayStack.splice(currentIndex, 1);
    }
    this.overlayStack.push(overlay);

    this.activeOverlay = this.overlayStack[this.overlayStack.length - 1] || null;

    if (this.overlayStack.length === 1) {
      this.previousFocusedEl = document.activeElement as HTMLElement;
    }

    const focusTarget = this.activeOverlay?.overlayGetFocusTarget?.();
    if (focusTarget) {
      focusTarget.focus();
    }

    this.updateOverlayState();
  }

  clearActive(overlay: any): void {
    const index = this.overlayStack.indexOf(overlay);
    if (index === -1) {
      return;
    }

    this.overlayStack.splice(index, 1);
    this.activeOverlay = this.overlayStack[this.overlayStack.length - 1] || null;

    if (this.overlayStack.length === 0 && this.previousFocusedEl) {
      this.previousFocusedEl.focus();
      this.previousFocusedEl = null;
    } else if (this.activeOverlay?.overlayGetFocusTarget) {
      this.activeOverlay.overlayGetFocusTarget()?.focus();
    }

    this.updateOverlayState();
  }

  getActiveOverlay(): any {
    return this.activeOverlay;
  }

  private updateOverlayState(): void {
    if (!this.overlayEl) {
      return;
    }

    if (this.overlayStack.length === 0) {
      this.overlayEl.setAttribute('hidden', 'hidden');
      this.overlayEl.classList.remove('is-active');
      return;
    }

    this.overlayEl.removeAttribute('hidden');
    this.overlayEl.classList.add('is-active');

    const activeIndex = this.overlayStack.length - 1;
    const overlayZ = this.baseZIndex + activeIndex * 2;
    const activeOverlay = this.activeOverlay;

    this.overlayEl.style.zIndex = `${overlayZ}`;

    if (activeOverlay?.overlayGetElement) {
      const targetEl = activeOverlay.overlayGetElement();
      if (targetEl) {
        targetEl.style.zIndex = `${overlayZ + 1}`;
      }
    } else if (activeOverlay?.el) {
      activeOverlay.el.style.zIndex = `${overlayZ + 1}`;
    }
  }
}
