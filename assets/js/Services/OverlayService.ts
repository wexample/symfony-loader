import AppService from '../Class/AppService';
import ComponentsService from './ComponentsService';
import InvariantViolationError from '../Errors/InvariantViolationError';

export default class OverlayService extends AppService {
  public static serviceName: string = 'overlay';

  public static OVERLAY_TARGET_MAIN: string = 'main';
  public static OVERLAY_TARGET_GLOBAL: string = 'global';

  /**
   * The component showStandalone() puts on the page, left for whoever ships
   * one. Stacking, focus and the escape key are this service's business; the
   * backdrop itself is markup, and markup belongs to the design system the
   * application installed. Nothing else in the service needs it — an overlay
   * a component registers brings its own element — so an application that
   * never calls showStandalone() can keep this base as it is.
   */
  public static componentPath: string | null = null;

  private activeOverlay: any = null;
  private previousFocusedEl: HTMLElement | null = null;
  private registered = new Set<any>();
  private overlayStack: any[] = [];
  private overlayElGlobal: HTMLElement | null = null;
  private overlayElMain: HTMLElement | null = null;
  private baseZIndex: number = 1000;

  public async showStandalone(options: {
    className?: string;
    contentHtml?: string;
    timeout?: number;
    overlayTarget?: string;
  } = {}): Promise<{ instance: any; close: () => Promise<void> } | null> {
    const service = this.app.getServiceOrFail(ComponentsService) as ComponentsService;
    const componentOptions: { className?: string; layoutBody?: string; overlayBackdropTarget?: string } = {};
    if (options.className) {
      componentOptions.className = options.className;
    }
    if (options.contentHtml !== undefined) {
      componentOptions.layoutBody = options.contentHtml;
    }
    componentOptions.overlayBackdropTarget = options.overlayTarget || OverlayService.OVERLAY_TARGET_MAIN;

    const componentPath = (this.constructor as typeof OverlayService).componentPath;

    if (!componentPath) {
      throw new InvariantViolationError({
        message: 'No overlay component: register the OverlayService your design system ships, or set OverlayService.componentPath.',
        code: 'ERR_OVERLAY_COMPONENT_UNSET',
        context: { serviceName: OverlayService.serviceName },
      });
    }

    const created = await service.createComponentFromTemplate(
      componentPath,
      componentOptions,
      this.app.layout
    );

    if (!created) {
      return null;
    }

    const instance: any = created.instance;
    if (instance.open) {
      await instance.open();
    }

    const close = async () => {
      if (instance.close) {
        await instance.close();
      }
    };

    if (options.timeout) {
      window.setTimeout(() => {
        void close();
      }, options.timeout);
    }

    return {
      instance,
      close,
    };
  }

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

    const overlayTarget = this.getOverlayTarget(overlay);
    if (
      overlayTarget === OverlayService.OVERLAY_TARGET_MAIN
      && !this.isTargetInsideOverlayTarget(target, overlayTarget)
    ) {
      return;
    }

    (overlay as any).overlayOnClickOutside(event);
  };

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.overlayElGlobal = document.getElementById('overlay-layer');
          this.overlayElMain = document.getElementById('overlay-layer-main');

          if (!this.overlayElGlobal) {
            throw new InvariantViolationError({
              message: 'Missing overlay container "#overlay-layer".',
              code: 'ERR_OVERLAY_CONTAINER_MISSING',
            });
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

    const closingEl = overlay?.overlayGetElement?.() || overlay?.el;
    if (closingEl) {
      closingEl.style.removeProperty('--overlay-depth');
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

  private getOverlayTarget(overlay: any): string {
    return overlay?.overlayBackdropTarget || OverlayService.OVERLAY_TARGET_GLOBAL;
  }

  private getOverlayElByTarget(target: string): HTMLElement | null {
    if (target === OverlayService.OVERLAY_TARGET_GLOBAL) {
      return this.overlayElGlobal || this.overlayElMain;
    }

    return this.overlayElMain || this.overlayElGlobal;
  }

  private isTargetInsideOverlayTarget(target: Node, overlayTarget: string): boolean {
    const scopeEl = this.getOverlayElByTarget(overlayTarget);
    if (!scopeEl) {
      return true;
    }

    return scopeEl.contains(target);
  }

  private getBackdropOverlay(): any | null {
    for (let index = this.overlayStack.length - 1; index >= 0; index--) {
      const overlay = this.overlayStack[index];
      if (overlay.overlayUseBackdrop !== false) {
        return overlay;
      }
    }

    return null;
  }

  private hideOverlayEl(overlayEl: HTMLElement | null): void {
    if (!overlayEl) {
      return;
    }
    overlayEl.setAttribute('hidden', 'hidden');
    overlayEl.classList.remove('is-active');
  }

  private updateOverlayState(): void {
    if (!this.overlayElGlobal && !this.overlayElMain) {
      return;
    }

    if (!this.overlayStack.length) {
      this.hideOverlayEl(this.overlayElGlobal);
      this.hideOverlayEl(this.overlayElMain);
      return;
    }

    const backdropOverlay = this.getBackdropOverlay();
    if (!backdropOverlay) {
      this.hideOverlayEl(this.overlayElGlobal);
      this.hideOverlayEl(this.overlayElMain);
      return;
    }

    const target = this.getOverlayTarget(backdropOverlay);
    const targetOverlayEl = this.getOverlayElByTarget(target);
    const otherOverlayEl =
      target === OverlayService.OVERLAY_TARGET_GLOBAL
        ? this.getOverlayElByTarget(OverlayService.OVERLAY_TARGET_MAIN)
        : this.getOverlayElByTarget(OverlayService.OVERLAY_TARGET_GLOBAL);

    this.hideOverlayEl(otherOverlayEl);

    const stackLength = this.overlayStack.length;

    // Use z-index gaps of 2 so the single backdrop can slot between layers.
    // overlay[i] = baseZIndex + i*2, and the backdrop sits just under the
    // overlay it belongs to — never under the topmost one, which may be an
    // overlay that wants no backdrop at all:
    // [modal]: modal=baseZIndex, backdrop=baseZIndex-1 (dims the page below)
    // [modal, modal]: 1000 / 1002, backdrop=1001 (dims the parent modal)
    // [modal, select]: 1000 / 1002, backdrop=999 — the select opens inside the
    // modal, so a backdrop above the modal would cover the very field it was
    // opened from.
    for (let i = 0; i < stackLength; i++) {
      const overlay = this.overlayStack[i];
      const el = overlay?.overlayGetElement?.() || overlay?.el;
      if (el) {
        el.style.zIndex = String(this.baseZIndex + i * 2);

        // Depth counts only overlays of the same group above this one.
        // Overlays without a group (confirmations, toasts…) never affect peer depth.
        const group = overlay?.overlayDepthGroup;
        if (group) {
          let depth = 0;
          for (let j = i + 1; j < stackLength; j++) {
            if (this.overlayStack[j]?.overlayDepthGroup === group) {
              depth++;
            }
          }
          el.style.setProperty('--overlay-depth', String(depth));
        } else {
          el.style.removeProperty('--overlay-depth');
        }
      }
    }

    if (targetOverlayEl) {
      const backdropIndex = this.overlayStack.indexOf(backdropOverlay);

      targetOverlayEl.removeAttribute('hidden');
      targetOverlayEl.classList.add('is-active');
      targetOverlayEl.style.zIndex = String(this.baseZIndex + backdropIndex * 2 - 1);
    }
  }
}
