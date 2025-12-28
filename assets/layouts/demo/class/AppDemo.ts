import App from '../../../js/class/App';
import AppService from '../../../js/class/AppService';
import DebugService from '../../../js/Services/DebugService';
import VueService from '../../../js/Services/VueService';

export default class extends App {
  getServices(): (typeof AppService | [typeof AppService, any[]])[] {
    return [...super.getServices(), ...[
      VueService,
      DebugService
    ]];
  }
}
