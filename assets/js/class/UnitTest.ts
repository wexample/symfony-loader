import AppChild from './AppChild';

export default abstract class extends AppChild {
  assertEquals(value: any, expected: any, message?: string, fatal: boolean = true) {
    let styleDefault = 'border-radius:10rem;';
    message = message || expected;

    if (value !== expected) {
      console.log(
        '%c Fail ',
        `background: #FFCCCC; color: #880000; ${styleDefault}`,
        `Assertion failed, ${value} is not equal to expected value : ${expected}. ${message || ''}`
      );

      if (fatal) {
        throw new Error('UNIT TEST ERROR');
      }
    } else {
      console.log(
        '%c Success ',
        `background: #00FF00; color: #002200; ${styleDefault}`,
        message || expected
      );
    }
  }

  assertTrue(value, message?: string) {
    this.assertEquals(value, true, message);
  }

  assertFalse(value, message?: string) {
    this.assertEquals(value, false, message);
  }

  public init() {
    // To override.
  }

  public abstract getTestMethods();
}
