export default class OverlayMixin {
  static apply(instance: any) {
    if (instance.__overlayMixinApplied) {
      return;
    }

    instance.__overlayMixinApplied = true;

    if (instance.overlayEnabled === undefined) {
      instance.overlayEnabled = true;
    }

    const originalActivate = instance.activateListeners
      ? instance.activateListeners.bind(instance)
      : null;
    const originalDeactivate = instance.deactivateListeners
      ? instance.deactivateListeners.bind(instance)
      : null;

    if (!instance.__overlayListenersWrapped) {
      instance.activateListeners = async (...args) => {
        if (originalActivate) {
          await originalActivate(...args);
        }

        if (instance.overlayEnabled) {
          instance.app.services.overlay.register(instance);
        }
      };

      instance.deactivateListeners = async (...args) => {
        if (originalDeactivate) {
          await originalDeactivate(...args);
        }

        if (instance.overlayEnabled) {
          instance.app.services.overlay.unregister(instance);
        }
      };

      instance.__overlayListenersWrapped = true;
    }

    if (!instance.overlayIsOpen) {
      instance.overlayIsOpen = () => {
        return !!instance.el && instance.el.classList.contains('is-open');
      };
    }

    if (!instance.overlayGetElement) {
      instance.overlayGetElement = () => {
        return instance.el;
      };
    }

    if (!instance.overlayGetFocusTarget) {
      instance.overlayGetFocusTarget = () => {
        return null;
      };
    }

    if (!instance.overlayOnOpen) {
      instance.overlayOnOpen = () => {};
    }

    if (!instance.overlayOnClose) {
      instance.overlayOnClose = () => {};
    }

    if (!instance.overlayOnEscape) {
      instance.overlayOnEscape = () => {
        instance.overlayClose();
      };
    }

    if (!instance.overlayOnClickOutside) {
      instance.overlayOnClickOutside = () => {
        instance.overlayClose();
      };
    }

    if (!instance.overlayOpen) {
      instance.overlayOpen = (event?: Event) => {
        if (instance.overlayIsOpen()) {
          return;
        }

        instance.el.classList.add('is-open');
        instance.app.services.overlay.setActive(instance);
        instance.overlayOnOpen(event);
      };
    }

    if (!instance.overlayClose) {
      instance.overlayClose = (event?: Event) => {
        if (!instance.overlayIsOpen()) {
          return;
        }

        instance.el.classList.remove('is-open');
        instance.overlayOnClose(event);
        instance.app.services.overlay.clearActive(instance);
      };
    }

    if (!instance.overlayToggle) {
      instance.overlayToggle = (event?: Event) => {
        if (instance.overlayIsOpen()) {
          instance.overlayClose(event);
        } else {
          instance.overlayOpen(event);
        }
      };
    }
  }
}
