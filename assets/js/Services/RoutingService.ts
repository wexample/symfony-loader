import AppService from '../Class/AppService';
import Routing from 'fos-router';

// Load FOS routes directly on this module's Routing singleton to avoid the
// duplicate-singleton issue caused by webpack-inject-plugin (@fosRoutes alias
// is set in webpack.config.mjs to point to var/cache/fosRoutes.json).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fosRoutes = require('@fosRoutes');
  Routing.setRoutingData(fosRoutes);
} catch (e) {
  // Silently ignore if the alias is not configured (non-webpack environments).
}

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
