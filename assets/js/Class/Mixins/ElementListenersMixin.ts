import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';
import { stringToPascalCase } from '@wexample/js-helpers/Helper/String';

export default class ElementListenersMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (!target.elements) {
        target.elements = {};
      }

      if (!target.elListenerProxies) {
        target.elListenerProxies = {};
      }

      if (!target.getElListeners) {
        target.getElListeners = () => ({});
      }

      if (!target.attachElListenersElements) {
        target.attachElListenersElements = () => {
          const listeners = target.getElListeners();
          for (const key of Object.keys(listeners)) {
            if (!target.elements[key]) {
              target.attachHtmlElement(key, `[data-el="${key}"]`);
            }
          }
        };
      }

      if (!target.activateElListeners) {
        target.activateElListeners = () => {
          const listeners = target.getElListeners();
          target.attachElListenersElements();

          for (const [key, events] of Object.entries(listeners)) {
            const eventList = Array.isArray(events) ? events : [events];
            for (const event of eventList) {
              const eventName = stringToPascalCase(event);
              const keyName = stringToPascalCase(key);
              const method = target[`on${eventName}${keyName}ElListener`];
              if (typeof method !== 'function') {
                throw new Error(
                  `Missing handler for "${event}" on element "${key}" in "${target.view || 'app'}". Expected on${eventName}${keyName}ElListener().`
                );
              }
              const proxy = method.bind(target);
              target.elListenerProxies[key] = target.elListenerProxies[key] || {};
              target.elListenerProxies[key][event] = proxy;
              target.onEl(key, event, proxy);
            }
          }
        };
      }

      if (!target.deactivateElListeners) {
        target.deactivateElListeners = () => {
          for (const [key, events] of Object.entries(target.elListenerProxies)) {
            for (const [event, proxy] of Object.entries(events)) {
              target.offEl(key, event, proxy);
            }
          }
          target.elListenerProxies = {};
        };
      }
    }, '__elementListenersMixinApplied');
  }
}
