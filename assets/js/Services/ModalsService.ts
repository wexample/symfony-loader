import AppService from '../class/AppService';
import ModalInterface from '../interfaces/RequestOptions/ModalInterface';
import PagesService from './PagesService';

export default class ModalsService extends AppService {
  public static dependencies: typeof AppService[] = [PagesService];
  public services: {
    pages: PagesService;
  };
  public static serviceName: string = 'modals';

  get(path: string, requestOptions: ModalInterface = {}): Promise<any> {
    // This define the target layout
    requestOptions.layout = requestOptions.layout || 'modal';

    return this.app.services.adaptive.get(path, requestOptions);
  }
}
