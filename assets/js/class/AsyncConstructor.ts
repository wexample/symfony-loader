export default abstract class {
  public isReady: boolean = false;
  public readyCallbacks: Function[] = [];

  async(callback) {
    setTimeout(callback);
  }

  ready(callback: Function) {
    if (this.isReady) {
      this.async(callback());
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  async readyComplete(...args: any[]) {
    this.isReady = true;
    // Launch callbacks.
    await this.callbacks(this.readyCallbacks, args);
  }

  /**
   * Execute an array of callbacks functions.
   */
  async callbacks(callbacksArray, args = [], thisArg = null) {
    let method = args ? 'apply' : 'call';
    let callback = null;

    while ((callback = callbacksArray.shift())) {
      if (!callback) {
        throw 'Trying to execute undefined callback.';
      }

      await callback[method](thisArg || this, args);
    }
  }

  seal() {
    Object.seal(this);
  }
}
