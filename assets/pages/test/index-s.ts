import PageResponsiveDisplay from '../../js/Class/PageResponsiveDisplay';

export default class extends PageResponsiveDisplay {
  async onResponsiveEnter() {
    if (this.page.vars.responsiveSizesCounters) {
      this.page.vars.responsiveSizesCounters.s++;
    }
  }

  async onResponsiveExit() {
    if (this.page.vars.responsiveSizesCounters) {
      this.page.vars.responsiveSizesCounters.s--;
    }
  }
}
