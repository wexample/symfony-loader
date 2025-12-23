import AbstractTest from "./AbstractTest";

export default class NoJsTest extends AbstractTest {
  public getTestMethods() {
    return [
      this.testDefault,
    ];
  }

  private testDefault() {
    this.fetchAdaptiveHtmlPage(`${this.pathCoreTestAdaptive}?no-js=1`).then((html: string) => {
      this.assertTrue(
        html.indexOf('NO_JS_TEXT') !== -1,
        'No JS page rendered and contains NO_JS_TEXT'
      )
    });
  }
}
