import AppService from '../class/AppService';
import MixinsAppService from '../class/MixinsAppService';

export default class MixinsService extends AppService {
  public static serviceName: string = 'mixins';

  /**
   * Execute a hook until all ext do not return false.
   * Useful to manage order when processing : an ext can wait for
   * another one to be executed.
   *
   * The pre-last arg of callback will be a registry of ext statuses.
   * The last arg of callback well be a next() method in case of async operation.
   *
   * @param method
   * @param args
   * @param group
   * @param timeoutLimit
   * @param services
   */
  invokeUntilComplete(
    method,
    group = 'app',
    args = [],
    timeoutLimit: number = 2000,
    services: AppService[] = Object.values(this.app.services) as AppService[]
  ): Promise<any> {
    return new Promise(async (resolve) => {
      let errorTrace: AppService[] = [];
      let loops: number = 0;
      let loopsLimit: number = 100;
      let registry: { [key: string]: string } = {};
      let service;

      while (service = services.shift()) {
        let timeout = setTimeout(() => {
          throw `Mixins invocation timeout on method "${method}", stopping at "${currentName}".`;
        }, timeoutLimit);

        let currentName = service.constructor.serviceName;
        let hooks = service.registerHooks();

        if (loops++ > loopsLimit) {
          console.error(errorTrace);
          console.error(registry);
          throw (
            `Stopping more than ${loops} recursions during services invocation ` +
            `on method "${method}", stopping at ${currentName}, see trace below.`
          );
        } else if (loops > loopsLimit - 10) {
          errorTrace.push(service);
        }

        if (hooks && hooks[group] && hooks[group][method]) {
          let argsLocal = args.concat([registry]);
          registry[currentName] = await hooks[group][method].apply(
            service,
            argsLocal
          );
        }

        if (registry[currentName] === undefined) {
          registry[currentName] = MixinsAppService.LOAD_STATUS_COMPLETE;
        }

        // "wait" says to retry after processing other services.
        if (registry[currentName] === MixinsAppService.LOAD_STATUS_WAIT) {
          // Enqueue again.
          services.push(service);
        }

        clearTimeout(timeout);
      }

      resolve(true);
    });
  }

  /**
   * Apply all registered methods from all services to object.
   *
   * @param dest
   * @param group
   */
  applyMethods(dest: object, group: string) {
    Object.values(this.app.services).forEach((service: AppService) => {
      let methods = service.registerMethods(dest, group);

      if (methods && methods[group]) {
        let toMix = methods[group];

        // Use a "one level deep merge" to allow mix groups of methods.
        for (let i in toMix) {
          let value = toMix[i];

          // Mix objects.
          if (value && value.constructor && value.constructor === Object) {
            dest[i] = dest[i] || {};

            Object.assign(dest[i], toMix[i]);
          }
          // Methods, bind it to main object.
          else if (typeof value === 'function') {
            dest[i] = toMix[i].bind(dest);
          }
          // Override others.
          else {
            dest[i] = toMix[i];
          }
        }
      }
    });
  }

  applyMixin(instance: any, mixin: any) {
    Object.getOwnPropertyNames(mixin.prototype).forEach(name => {
      if (name !== 'constructor') {
        instance[name] = mixin.prototype[name];
      }
    });
  }
}
