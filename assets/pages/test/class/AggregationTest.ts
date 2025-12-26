import UnitTest from '../../../js/class/UnitTest';

export default class AggregationTest extends UnitTest {
  public getTestMethods() {
    return [
      this.testDefault,
    ];
  }

  private testDefault(path: string, testString: string) {
    let enableAggregation = this.app.layout.vars.enableAggregation;

    this.assertEquals(typeof (enableAggregation), 'boolean')

    this.assertEquals(
      /\.agg\.[a-z\?0-9]*"/.test(document.documentElement.innerHTML),
      enableAggregation,
      `The aggregation mode is ${enableAggregation ? 'enabled' : 'disabled'}, .agg files are present according to it.`
    );

    if (enableAggregation) {
      this.assertEquals(
        document.head.querySelectorAll('link[rel=preload]').length,
        9,
        `There is 9 preloaded items when aggregation is enabled (js, css), including base base scripts and separated responsive`
      );
    } else {
      this.assertTrue(
        document.head.querySelectorAll('link[rel=preload]').length > 2,
        `There is more than two preloaded items when aggregation is off (around one per render node)`
      );
    }
  }
}
