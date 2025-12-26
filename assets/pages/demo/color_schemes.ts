import Page from '../../js/class/Page';
import Events from '../../js/helpers/Events';

export default class extends Page {
  async pageReady() {
    document
      .querySelectorAll('.demo-button-switch-usage')
      .forEach((el) => {
        el.addEventListener(Events.CLICK, async () => {
          await this.app.layout.setUsage(
            el.getAttribute('data-usage-name'),
            el.getAttribute('data-usage-value'),
          );
        });
      });
  }
}
