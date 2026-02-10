import Component from '../../js/Class/Component';

export default class extends Component {
  private inputEl: HTMLInputElement | null = null;
  private toggleEl: HTMLButtonElement | null = null;
  private onToggleProxy: EventListener | null = null;

  attachHtmlElements() {
    super.attachHtmlElements();

    this.inputEl = this.el.querySelector('.form--input-password');
    this.toggleEl = this.el.querySelector('.form--input-toggle');

    if (!this.inputEl || !this.toggleEl) {
      return;
    }

    this.onToggleProxy = this.onToggle.bind(this);
    this.toggleEl.addEventListener('click', this.onToggleProxy);
    this.syncToggleState();
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.toggleEl && this.onToggleProxy) {
      this.toggleEl.removeEventListener('click', this.onToggleProxy);
    }
  }

  private onToggle() {
    if (!this.inputEl) {
      return;
    }

    this.inputEl.type = this.inputEl.type === 'password' ? 'text' : 'password';
    this.syncToggleState();
  }

  private syncToggleState() {
    if (!this.toggleEl || !this.inputEl) {
      return;
    }

    const isVisible = this.inputEl.type !== 'password';
    this.toggleEl.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
    this.toggleEl.classList.toggle('is-visible', isVisible);
  }
}
