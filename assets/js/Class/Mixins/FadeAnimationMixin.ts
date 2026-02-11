import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';
import { waitForAnimationEnd } from '@wexample/js-helpers/Helper/Animation';

export default class FadeAnimationMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (target.fadeAnimationClosing === undefined) {
        target.fadeAnimationClosing = false;
      }

      if (!target.fadeAnimationGetElement) {
        target.fadeAnimationGetElement = () => {
          return target.el;
        };
      }

      if (!target.closeWithAnimation) {
        target.closeWithAnimation = async (...args: any[]) => {
          if (target.exit) {
            return target.exit(...args);
          }
        };
      }

      if (!target.fadeOpen) {
        target.fadeOpen = async () => {
          const el: HTMLElement | null = target.fadeAnimationGetElement?.() || target.el;
          if (!el) {
            return;
          }

          el.classList.remove('is-opening');
          void el.offsetWidth;
          el.classList.add('is-opening');
          await waitForAnimationEnd(el, 220);
          el.classList.remove('is-opening');
        };
      }

      const originalExit = target.exit ? target.exit.bind(target) : null;

      target.exit = async (...args: any[]) => {
        if (target.fadeAnimationClosing) {
          return;
        }

        target.fadeAnimationClosing = true;

        const el: HTMLElement | null = target.fadeAnimationGetElement?.() || target.el;
        if (el) {
          el.classList.add('is-closing');
          await waitForAnimationEnd(el, 220);
        }

        if (originalExit) {
          return originalExit(...args);
        }
      };
    }, '__fadeAnimationMixinApplied');
  }
}
