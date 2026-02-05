import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';
import FocusableComponentMixin from './FocusableComponentMixin';

export default class OverlayMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (target.overlayEnabled === undefined) {
        target.overlayEnabled = true;
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

        if (target.overlayEnabled) {
          target.app.services.overlay.register(target);
        }
      };

      target.deactivateListeners = async (...args) => {
        if (originalDeactivate) {
          await originalDeactivate(...args);
        }

        if (target.overlayEnabled) {
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
        target.overlayOnOpen = () => {};
      }

      if (!target.overlayOnClose) {
        target.overlayOnClose = () => {};
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
        target.overlayOpen = (event?: Event) => {
          if (target.overlayIsOpen()) {
            return;
          }

          target.el.classList.add('is-open');
          target.app.services.overlay.setActive(target);
          target.overlayOnOpen(event);
        };
      }

      if (!target.overlayClose) {
        target.overlayClose = (event?: Event) => {
          if (!target.overlayIsOpen()) {
            return;
          }

          target.el.classList.remove('is-open');
          target.overlayOnClose(event);
          target.app.services.overlay.clearActive(target);
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
