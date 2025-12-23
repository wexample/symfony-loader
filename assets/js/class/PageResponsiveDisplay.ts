import Page from './Page';
import AppChild from './AppChild';

export default class extends AppChild {
  protected readonly page: Page;

  constructor(page) {
    super(page.app);
    this.page = page;
  }

  async init() {
    // To override.
  }

  async onResponsiveEnter() {
    // To override.
  }

  async onResponsiveExit() {
    // To override.
  }
}
