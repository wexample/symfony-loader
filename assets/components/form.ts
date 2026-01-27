import Component from '../js/Class/Component';

export default class extends Component {
  private onSubmitProxy: EventListener;

  protected async activateListeners(): Promise<void> {
    await super.activateListeners();

    if (!this.options?.ajax) {
      return;
    }

    this.onSubmitProxy = this.onSubmit.bind(this);
    this.el.addEventListener('submit', this.onSubmitProxy);
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.onSubmitProxy) {
      this.el.removeEventListener('submit', this.onSubmitProxy);
    }
  }

  private async onSubmit(event: SubmitEvent) {
    if (!this.options?.ajax) {
      return;
    }

    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const submitter = (event as any).submitter as
      | HTMLInputElement
      | HTMLButtonElement
      | null;

    if (submitter?.name) {
      formData.append(submitter.name, 'true');
    }

    const action =
      form.getAttribute('action') ||
      window.location.pathname +
        window.location.search +
        (window.location.hash || '');

    await this.app.services.adaptive.get(action, {
      method: 'POST',
      body: formData,
    } as any);
  }
}
