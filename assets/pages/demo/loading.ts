import Page from'../../js/class/Page';
import ModalsService from'../../js/Services/ModalsService';
import AppService from'../../js/class/AppService';
import ServicesRegistryInterface from'../../js/interfaces/ServicesRegistryInterface';

export default class extends Page {
  services: ServicesRegistryInterface;

  getPageLevelServices(): typeof AppService[] {
    return [ModalsService];
  }

  async pageReady() {
    this.el.querySelector('#page-modal-show').addEventListener('click', () => {
      (this.app.getService(ModalsService) as ModalsService).get('/_loader/demo/loading-fetch-simple');
    });
  }
}
