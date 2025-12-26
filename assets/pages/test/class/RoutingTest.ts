import AbstractTest from "./AbstractTest";
import Routing from 'fos-router';

export default class RoutingTest extends AbstractTest {
  public getTestMethods() {
    return [
      this.testNotEmpty
    ];
  }

  private testNotEmpty() {
    this.assertTrue(
      Object.values(Routing.getRoutes()).length > 0,
      'Some routes are registered'
    )
  }
}
