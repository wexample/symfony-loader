import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';
import FocusableComponentMixin from './FocusableComponentMixin';

export default class OverlayMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (target.overlayEnabled === undefined) {
        target.overlayEnabled = true;
      }
      if (target.overlayUseBackdrop === undefined) {
        target.overlayUseBackdrop = true;
      }
      if (target.overlayUseStack === undefined) {
        target.overlayUseStack = true;
      }
      if (target.overlaySetHiddenOnOpen === undefined) {
        target.overlaySetHiddenOnOpen = true;
      }
      if (target.overlaySetHiddenOnClose === undefined) {
        target.overlaySetHiddenOnClose = true;
      }
      if (target.overlayAnimateClose === undefined) {
        target.overlayAnimateClose = false;
      }
      if (target.overlayExitOnClose === undefined) {
        target.overlayExitOnClose = true;
      }

      const originalActivate = target.activateListeners
        ? target.activateListeners.bind(target)
        : null;
      const originalDeactivate = target.deactivateListeners
        ? target.deactivateListeners.bind(target)
        : null;

      target.activateListeners = async (...args) => {
        if (originalActivate) {
          await originalActivate(...args);
        }

        if (target.overlayEnabled && target.overlayUseStack) {
          target.app.services.overlay.register(target);
        }
      };

      target.deactivateListeners = async (...args) => {
        if (originalDeactivate) {
          await originalDeactivate(...args);
        }

        if (target.overlayEnabled && target.overlayUseStack) {
          target.app.services.overlay.unregister(target);
        }
      };

      if (!target.overlayIsOpen) {
        target.overlayIsOpen = () => {
          return !!target.el && target.el.classList.contains('is-open');
        };
      }

      if (!target.overlayGetElement) {
        target.overlayGetElement = () => {
          return target.el;
        };
      }

      if (!target.overlayGetFocusTarget) {
        target.overlayGetFocusTarget = () => {
          return null;
        };
      }

      if (!target.overlayOnOpen) {
        target.overlayOnOpen = async (_instant: boolean = false) => {};
      }

      if (!target.overlayOnClose) {
        target.overlayOnClose = async (_instant: boolean = false) => {};
      }

      if (!target.overlayOnEscape) {
        target.overlayOnEscape = () => {
          target.overlayClose();
        };
      }

      if (!target.overlayOnClickOutside) {
        target.overlayOnClickOutside = () => {
          target.overlayClose();
        };
      }

      if (!target.overlayOpen) {
        target.overlayOpen = (eventOrInstant?: Event | boolean) => {
          if (target.overlayIsOpen()) {
            return;
          }

          const instant = eventOrInstant === true;
          target.el.classList.add('is-open');
          if (target.overlaySetHiddenOnOpen) {
            target.el.removeAttribute('hidden');
          }
          if (target.overlayUseStack) {
            target.app.services.overlay.setActive(target);
          }
          target.overlayOnOpen(instant);
        };
      }

      if (!target.overlayClose) {
        target.overlayClose = async (eventOrInstant?: Event | boolean) => {
          if (!target.overlayIsOpen()) {
            return;
          }

          const instant = eventOrInstant === true;
          if (!instant && target.overlayAnimateClose && target.closeWithAnimation) {
            await target.overlayOnClose(false);
            if (target.overlayUseStack) {
              target.app.services.overlay.clearActive(target);
            }
            return target.closeWithAnimation();
          }

          target.el.classList.remove('is-open');
          await target.overlayOnClose(instant);
          if (target.overlayUseStack) {
            target.app.services.overlay.clearActive(target);
          }
          if (target.overlaySetHiddenOnClose) {
            target.el.setAttribute('hidden', 'hidden');
          }
          if (target.overlayExitOnClose) {
            await target.exit();
          }
        };
      }

      if (!target.overlayToggle) {
        target.overlayToggle = (event?: Event) => {
          if (target.overlayIsOpen()) {
            target.overlayClose(event);
          } else {
            target.overlayOpen(event);
          }
        };
      }

      if (!target.focusableShouldHandleEscape) {
        target.focusableShouldHandleEscape = () => {
          if (!target.overlayUseStack) {
            return target.overlayIsOpen();
          }

          const activeOverlay = target.app.services.overlay.getActiveOverlay?.();

          if (activeOverlay !== target) {
            return false;
          }

          return target.overlayIsOpen();
        };
      }

      FocusableComponentMixin.apply(target);
    }, '__overlayMixinApplied');
  }
}
