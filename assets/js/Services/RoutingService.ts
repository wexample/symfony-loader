import AppService from '../Class/AppService';
import Routing from 'fos-router';

export default class RoutingService extends AppService {
  public static serviceName: string = 'routing';

  getRoutes(): Record<string, unknown> {
    return Routing.getRoutes() || {};
  }

  hasRoute(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.getRoutes(), name);
  }

  generate(route: string, params: any = {}): string {
    return Routing.generate(route, params);
  }

  path(route: string, params: any = {}): string {
    // Routes are generated and imported using webpack and runtime.js file.
    return this.generate(route, params);
  }
}
