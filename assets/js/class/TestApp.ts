import App from './App';
import AppService from './AppService';
import VueService from '../Services/VueService';

export default class extends App {
  getServices(): (typeof AppService | [typeof AppService, any[]])[] {
    return [...super.getServices(), ...[VueService]];
  }
}
