import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';

export default class FocusableComponentMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (target.focusableEnabled === undefined) {
        target.focusableEnabled = true;
      }

      if (target.focusableEscapeKey === undefined) {
        target.focusableEscapeKey = 'Escape';
      }

      if (target.focusableEscapePriority === undefined) {
        target.focusableEscapePriority = 100;
      }

      if (!target.focusableShouldHandleEscape) {
        target.focusableShouldHandleEscape = (_event?: KeyboardEvent): boolean => {
          if (!target.focusableEnabled) {
            return false;
          }

          return true;
        };
      }

      if (!target.focusableOnEscape) {
        target.focusableOnEscape = (event?: KeyboardEvent) => {
          if (target.overlayOnEscape) {
            return target.overlayOnEscape(event);
          }

          if (target.close) {
            return target.close(event);
          }
        };
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

        if (!target.focusableEnabled) {
          return;
        }

        target.app.services.keyboard.registerKeyDown(
          target,
          target.focusableEscapeKey,
          (event: KeyboardEvent) => {
            if (!target.focusableShouldHandleEscape(event)) {
              return false;
            }

            return target.focusableOnEscape(event);
          },
          {
            priority: target.focusableEscapePriority,
            preventDefault: true
          }
        );
      };

      target.deactivateListeners = async (...args) => {
        if (target.focusableEnabled) {
          target.app.services.keyboard.unregisterOwner(target);
        }

        if (originalDeactivate) {
          await originalDeactivate(...args);
        }
      };
    }, '__focusableComponentMixinApplied');
  }
}
