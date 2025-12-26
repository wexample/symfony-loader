import Page from '../../js/class/Page';

export default class extends Page {
  async updateCurrentResponsiveDisplay() {
    let current = this.app.layout.responsiveSizeCurrent;

    document
      .querySelectorAll('.display-breakpoint')
      .forEach((el) => el.classList.remove('display-breakpoint-current'));

    document
      .querySelector(`.display-breakpoint-${current}`)
      .classList.add('display-breakpoint-current');
  }
}
