import PageResponsiveDisplay from '../../js/Class/PageResponsiveDisplay';

export default class extends PageResponsiveDisplay {
  async onResponsiveEnter() {
    if (this.page.vars.responsiveSizesCounters) {
      this.page.vars.responsiveSizesCounters.xxl++;
    }
  }

  async onResponsiveExit() {
    if (this.page.vars.responsiveSizesCounters) {
      this.page.vars.responsiveSizesCounters.xxl--;
    }
  }
}
