import Page from '../../js/class/Page';

export default class extends Page {
  async pageReady(): Promise<void> {
    let el = this.el.querySelector('.adaptive-page-test-js') as HTMLElement;
    el.style.backgroundColor = 'green';
  }
}
