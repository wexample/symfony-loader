import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';

// One observer for every component waiting to be seen, as the lazy loader
// keeps one for its placeholders — and its margin: started a little before it
// shows, the component is ready by the time it does.
let observer: IntersectionObserver | null = null;
const waiting = new WeakMap<Element, () => void>();

function observe(el: Element, onVisible: () => void): void {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer?.unobserve(entry.target);
          const callback = waiting.get(entry.target);
          waiting.delete(entry.target);
          callback?.();
        }
      }
    },
    { rootMargin: '50px' }
  );

  waiting.set(el, onVisible);
  observer.observe(el);
}

function forget(el: Element): void {
  waiting.delete(el);
  observer?.unobserve(el);
}

/**
 * A component whose script waits to be seen: its html is in the page from the
 * start, its `activateListeners()` runs once it comes into view — a chart, a
 * map, anything built around a heavy library. The page mounts its components
 * one after the other, each awaiting the last: one that initialises below the
 * fold holds back every one after it, the ones in view included.
 *
 * Applied in `init()`, it makes the component lazy by default; a call says
 * otherwise with the `lazy: false` option — a chart at the top of a page. One
 * held out of view — a closed tab, a folded panel — waits until it shows.
 * `deactivateListeners()` undoes only what was done: a component never seen
 * has nothing to take down.
 */
export default class LazyActivationMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      // The component's own methods, the ones its class and its parents wrote.
      const activate = target.activateListeners.bind(target);
      const deactivate = target.deactivateListeners.bind(target);

      target.lazyActivated = null;
      target.lazyActivation = null;

      target.activateListeners = async () => {
        if (target.options?.lazy === false || typeof IntersectionObserver === 'undefined') {
          target.lazyActivated = true;
          target.lazyActivation = activate();
          return target.lazyActivation;
        }

        target.lazyActivated = false;
        observe(target.el, () => {
          target.lazyActivated = true;
          target.lazyActivation = activate();
        });
      };

      target.deactivateListeners = async () => {
        if (target.el) {
          forget(target.el);
        }

        if (target.lazyActivated) {
          // Taken down once it is up, never halfway.
          await target.lazyActivation;
          await deactivate();
        }

        target.lazyActivated = null;
        target.lazyActivation = null;
      };
    }, '__lazyActivationMixinApplied');
  }
}
