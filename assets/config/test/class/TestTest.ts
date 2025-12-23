import AbstractTest from "./AbstractTest";

export default class TestTest extends AbstractTest {
  public getTestMethods() {
    return [this.testAsserts];
  }

  public testAsserts() {
    this.assertTrue(true, 'Assert true works');

    this.assertFalse(false, 'Assert false works');

    this.assertEquals('A', 'A', 'Assert equals works');
  }
}
