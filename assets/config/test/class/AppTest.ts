import AbstractTest from "./AbstractTest";

export default class AppTest extends AbstractTest {
  public getTestMethods() {
    return [this.testAppInit];
  }

  public async testAppInit() {
    this.assertTrue(!!this.app, 'App exists');

    this.assertTrue(!!this.app.layout, 'App layout exists');

    this.assertTrue(
      this.app.layout.page === this.app.layout.pageFocused,
      'Current focused page is layout page'
    );
  }
}
