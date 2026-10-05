import AppService from '../Class/AppService';
import ModalInterface from '../Interfaces/RequestOptions/ModalInterface';
import PagesService from './PagesService';
import OverlayService from './OverlayService';

export default class ModalService extends AppService {
  public static dependencies: typeof AppService[] = [PagesService, OverlayService];
  public services: {
    pages: PagesService;
  };
  public static serviceName: string = 'modals';

  async get(path: string, requestOptions: ModalInterface = {}): Promise<any> {
    // This define the target layout
    requestOptions.layout = requestOptions.layout || 'modal';

    // The page dims from the click: the modal comes when its page does.
    const waiting = (this.app.services.overlay as OverlayService).waitWhileLoading();
    requestOptions.signal = requestOptions.signal || waiting.signal;

    try {
      return await this.app.services.adaptive.get(path, requestOptions);
    } finally {
      waiting.done();
    }
  }
}
