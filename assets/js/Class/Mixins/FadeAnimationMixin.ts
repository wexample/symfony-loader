import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';

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

      if (!target.fadeOpen) {
        target.fadeOpen = () => {
          const el: HTMLElement | null = target.fadeAnimationGetElement?.() || target.el;
          if (!el) {
            return;
          }

          el.classList.remove('is-opening');
          void el.offsetWidth;
          el.classList.add('is-opening');
          el.addEventListener(
            'animationend',
            () => {
              el.classList.remove('is-opening');
            },
            { once: true }
          );
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
          await new Promise<void>((resolve) => {
            const timeout = window.setTimeout(resolve, 220);
            const onEnd = () => {
              clearTimeout(timeout);
              resolve();
            };
            el.addEventListener('animationend', onEnd, { once: true });
          });
        }

        if (originalExit) {
          return originalExit(...args);
        }
      };
    }, '__fadeAnimationMixinApplied');
  }
}
