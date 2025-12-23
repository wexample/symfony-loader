import Layout from './Layout';

export default class extends Layout {
  public id: string = 'layout-initial';

  attachCoreHtmlElements() {
    this.el = document.getElementById('layout');
  }

  getElWidth(forceCache: boolean = false): number {
    // Responsiveness is relative to real window size.
    return window.innerWidth;
  }

  getElHeight(forceCache: boolean = false): number {
    return window.innerHeight;
  }
}
