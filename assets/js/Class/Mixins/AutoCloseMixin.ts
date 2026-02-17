import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';

export default class AutoCloseMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (!target.autoCloseTimeoutId) {
        target.autoCloseTimeoutId = undefined;
      }

      if (!target.startAutoClose) {
        target.startAutoClose = (timeout: number, onClose: () => void) => {
          if (target.autoCloseTimeoutId) {
            clearTimeout(target.autoCloseTimeoutId);
          }
          target.autoCloseTimeoutId = window.setTimeout(() => {
            target.autoCloseTimeoutId = undefined;
            onClose();
          }, timeout);
        };
      }

      if (!target.clearAutoClose) {
        target.clearAutoClose = () => {
          if (target.autoCloseTimeoutId) {
            clearTimeout(target.autoCloseTimeoutId);
            target.autoCloseTimeoutId = undefined;
          }
        };
      }
    }, '__autoCloseMixinApplied');
  }
}
