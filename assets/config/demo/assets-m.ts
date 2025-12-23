import PageResponsiveDisplay from '../../js/class/PageResponsiveDisplay';

export default class extends PageResponsiveDisplay {
  elButton: HTMLElement;
  onClickProxy: Function;

  async init() {
    this.elButton = this.page.el.querySelector('#responsive-page-m-button');
    this.onClickProxy = (e) => {
      alert('Clicked')
    };
  }

  async onResponsiveEnter() {
    console.log('index m init');

    this.elButton.removeAttribute(
      'disabled',
    );

    this.elButton.addEventListener(
      'click',
      this.onClickProxy as any
    );
  }

  async onResponsiveExit() {
    console.log('index m exit');

    this.elButton.setAttribute(
      'disabled',
      'disabled',
    );

    this.elButton.removeEventListener(
      'click',
      this.onClickProxy as any
    );
  }
}
