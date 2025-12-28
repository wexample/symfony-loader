import Page from '../../js/Class/Page';
import { EVENT } from '@wexample/js-helpers/Helper/Event';

export default class extends Page {
  async pageReady() {
    document
      .querySelectorAll('.demo-button-switch-usage')
      .forEach((el) => {
        el.addEventListener(EVENT.CLICK, async () => {
          await this.app.layout.setUsage(
            el.getAttribute('data-usage-name'),
            el.getAttribute('data-usage-value'),
          );
        });
      });
  }
}
