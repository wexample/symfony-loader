import AppService from '../Class/AppService';
import PagesService from './PagesService';
import OverlayService from './OverlayService';

export default class PanelService extends AppService {
  public static dependencies: typeof AppService[] = [PagesService, OverlayService];
  public services: {
    pages: PagesService;
  };
  public static serviceName: string = 'panels';

  async get(path: string, requestOptions: Record<string, any> = {}): Promise<any> {
    requestOptions.layout = 'panel';

    const separator = path.includes('?') ? '&' : '?';

    // The page dims from the click: the panel comes when its page does.
    const waiting = (this.app.services.overlay as OverlayService).waitWhileLoading();
    requestOptions.signal = requestOptions.signal || waiting.signal;

    try {
      return await this.app.services.adaptive.get(
        `${path}${separator}__layout=panel`,
        requestOptions
      );
    } finally {
      waiting.done();
    }
  }
}
