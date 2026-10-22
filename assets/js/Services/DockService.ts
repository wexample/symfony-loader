import AppService from '../Class/AppService';
import PagesService from './PagesService';
import OverlayService from './OverlayService';

// A page opened in a window docked at the foot of the screen: beside the page
// rather than over it, so nothing dims and nothing waits — the window shows
// its own loading bar once it is there.
export default class DockService extends AppService {
  public static dependencies: typeof AppService[] = [PagesService, OverlayService];
  public services: {
    pages: PagesService;
  };
  public static serviceName: string = 'docks';

  get(path: string, requestOptions: Record<string, any> = {}): Promise<any> {
    requestOptions.layout = 'dock';

    const separator = path.includes('?') ? '&' : '?';

    return this.app.services.adaptive.get(
      `${path}${separator}__layout=dock`,
      requestOptions
    );
  }
}
