import Page from'../../js/class/Page';
import ModalsService from'../../js/services/ModalsService';
import AppService from'../../js/class/AppService';
import ServicesRegistryInterface from'../../js/interfaces/ServicesRegistryInterface';

export default class extends Page {
  services: ServicesRegistryInterface;

  getPageLevelMixins(): typeof AppService[] {
    return [ModalsService];
  }

  async pageReady() {
    this.el
      .querySelector('.open-another-modal')
      .addEventListener('click', () => {
        (this.app.getService(ModalsService) as ModalsService)
          .get('/_design_system/demo/loading-fetch-simple');
      });
  }
}
