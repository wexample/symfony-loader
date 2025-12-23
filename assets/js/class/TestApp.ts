import App from './App';
import AppService from './AppService';
import VueService from '../services/VueService';

export default class extends App {
  getServices(): (typeof AppService | [typeof AppService, any[]])[] {
    return [...super.getServices(), ...[VueService]];
  }
}
