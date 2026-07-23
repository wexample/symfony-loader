import AppService from '../Class/AppService';
import PagesService from './PagesService';

export default class PanelService extends AppService {
  public static dependencies: typeof AppService[] = [PagesService];
  public services: {
    pages: PagesService;
  };
  public static serviceName: string = 'panels';

  get(path: string, requestOptions: Record<string, any> = {}): Promise<any> {
    requestOptions.layout = 'panel';

    const separator = path.includes('?') ? '&' : '?';

    return this.app.services.adaptive.get(
      `${path}${separator}__layout=panel`,
      requestOptions
    );
  }
}
