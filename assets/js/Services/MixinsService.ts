import AppService from '../Class/AppService';
import MixinsAppService from '../Class/MixinsAppService';

export default class MixinsService extends AppService {
  public static serviceName: string = 'mixins';

  async invokeUntilComplete(
    method: string,
    group = 'app',
    args: unknown[] = [],
    timeoutLimit: number = 2000,
    services: AppService[] = Object.values(this.app.services) as AppService[]
  ): Promise<boolean> {
    let errorTrace: AppService[] = [];
    let loops: number = 0;
    let loopsLimit: number = 100;
    let registry: { [key: string]: string } = {};
    let service: AppService | undefined;

    while (service = services.shift()) {
      let timeout = setTimeout(() => {
        throw `Mixins invocation timeout on method "${method}", stopping at "${currentName}".`;
      }, timeoutLimit);

      let currentName = (service.constructor as typeof AppService).serviceName;
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

      if (registry[currentName] === MixinsAppService.LOAD_STATUS_WAIT) {
        services.push(service);
      }

      clearTimeout(timeout);
    }

    return true;
  }

  applyMethods(dest: object, group: string) {
    Object.values(this.app.services).forEach((service: AppService) => {
      let methods = service.registerMethods(dest, group);

      if (methods && methods[group]) {
        let toMix = methods[group];

        for (let i in toMix) {
          let value = toMix[i];

          if (value && value.constructor && value.constructor === Object) {
            dest[i] = dest[i] || {};
            Object.assign(dest[i], toMix[i]);
          } else if (typeof value === 'function') {
            dest[i] = toMix[i].bind(dest);
          } else {
            dest[i] = toMix[i];
          }
        }
      }
    });
  }

  applyMixin(instance: object, mixin: { prototype: object }) {
    Object.getOwnPropertyNames(mixin.prototype).forEach(name => {
      if (name !== 'constructor') {
        (instance as Record<string, unknown>)[name] = (mixin.prototype as Record<string, unknown>)[name];
      }
    });
  }
}
