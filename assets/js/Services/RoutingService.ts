import AppService from '../Class/AppService';
import Routing from 'fos-router';
// @ts-ignore — alias resolved by webpack (voir webpack.config.mjs → @fosRoutes)
import fosRoutes from '@fosRoutes';

Routing.setRoutingData(fosRoutes);

export default class RoutingService extends AppService {
  public static serviceName: string = 'routing';

  getRoutes(): Record<string, unknown> {
    return Routing.getRoutes() || {};
  }

  hasRoute(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.getRoutes(), name);
  }

  generate(route: string, params: any = {}): string {
    return Routing.generate(route, this.withPageLocale(route, params));
  }

  /**
   * The routes are dumped at build time, with the default locale as the default
   * of `_locale`: a url built on a page in another language takes the page's.
   * Given only to routes carrying the placeholder, as any other would get it
   * appended as a query parameter.
   */
  private withPageLocale(route: string, params: any): any {
    const locale = document.documentElement.lang;
    const tokens = ((this.getRoutes()[route] as any)?.tokens || []) as any[];

    if (!locale || '_locale' in params || !tokens.some((token) => token[3] === '_locale')) {
      return params;
    }

    return { ...params, _locale: locale };
  }

  path(route: string, params: any = {}): string {
    // Routes are generated and imported using webpack and runtime.js file.
    return this.generate(route, params);
  }
}
