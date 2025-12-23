import Events from "../../js/helpers/Events";

export class WithKeyboardEventListenerRenderNode {
  protected listenKeyboardKey: string[] = [];
  protected onKeyUpProxy: Function;

  protected onKeyUp(event: KeyboardEvent) {
    if (this.listenKeyboardKey[event.key]) {
      this.listenKeyboardKey[event.key].call(this, event);
    }
  }

  public async activateKeyboardListeners(): Promise<void> {
    if (Object.values(this.listenKeyboardKey).length) {
      this.onKeyUpProxy = this.onKeyUp.bind(this);

      document.addEventListener(
        Events.KEYUP,
        this.onKeyUpProxy as EventListenerOrEventListenerObject
      );
    }
  }

  public async deactivateKeyboardListeners(): Promise<void> {
    if (Object.values(this.listenKeyboardKey).length) {
      document.removeEventListener(
        Events.KEYUP,
        this.onKeyUpProxy as EventListenerOrEventListenerObject
      );
    }
  }

  protected onListenedKeyUp(event: KeyboardEvent) {
    // To override...
  }
}