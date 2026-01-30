import Component from '../../js/Class/Component';

export default class extends Component {
  private textareaEl: HTMLTextAreaElement | null = null;
  private onInputProxy: EventListener | null = null;

  attachHtmlElements() {
    super.attachHtmlElements();

    this.textareaEl = this.el.querySelector('textarea');

    if (!this.textareaEl) {
      return;
    }

    if (this.options?.auto_resize) {
      this.onInputProxy = this.onInput.bind(this);
      this.textareaEl.addEventListener('input', this.onInputProxy);
      this.resizeToContent();
    }
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.textareaEl && this.onInputProxy) {
      this.textareaEl.removeEventListener('input', this.onInputProxy);
    }
  }

  private onInput() {
    this.resizeToContent();
  }

  private resizeToContent() {
    if (!this.textareaEl) {
      return;
    }

    const textarea = this.textareaEl;
    textarea.style.height = 'auto';

    const computed = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computed.lineHeight || '0') || 0;
    const padding =
      (parseFloat(computed.paddingTop || '0') || 0) +
      (parseFloat(computed.paddingBottom || '0') || 0);

    const minRows = Number(this.options?.rows || textarea.rows || 1);
    const maxRows = this.options?.max_rows
      ? Number(this.options.max_rows)
      : null;

    const minHeight =
      lineHeight > 0 ? lineHeight * minRows + padding : textarea.scrollHeight;
    let maxHeight: number | null = null;

    if (maxRows && lineHeight > 0) {
      maxHeight = lineHeight * maxRows + padding;
    }

    let nextHeight = Math.max(textarea.scrollHeight, minHeight);

    if (maxHeight) {
      nextHeight = Math.min(nextHeight, maxHeight);
      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }

    textarea.style.height = `${nextHeight}px`;
  }
}
