import App from '../../../js/class/App';
import AppService from '../../../js/class/AppService';
import DebugService from '../../../js/services/DebugService';
import VueService from '../../../js/services/VueService';

export default class extends App {
  getServices(): (typeof AppService | [typeof AppService, any[]])[] {
    return [...super.getServices(), ...[
      VueService,
      DebugService
    ]];
  }
}
