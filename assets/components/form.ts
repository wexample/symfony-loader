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

    const response = await this.app.services.adaptive.fetch(action, {
      method: 'POST',
      body: formData,
    } as any);

    if (!response.ok) {
      this.app.services.prompt?.applicationError(
        `Error response : [${response.status}] ${response.statusText}`
      );
      return;
    }

    const data = await response.json().catch((error: any) => {
      this.app.services.prompt?.applicationError(
        'Failed to parse JSON response:',
        error
      );
      return null;
    });

    if (!data) {
      return;
    }

    if (data.redirect?.url) {
      window.location.href = data.redirect.url;
      return;
    }

    if (data.form?.errors) {
      const catalog = data.translations
        ? { ...this.app.layout.translations, ...data.translations }
        : undefined;
      this.applyFormErrors(form, data.form.errors, catalog);
    }
  }

  private applyFormErrors(
    form: HTMLFormElement,
    errors: any,
    catalog?: Record<string, string>
  ) {
    this.clearFormErrors(form);

    if (Array.isArray(errors.form) && errors.form.length) {
      const container = document.createElement('div');
      container.className = 'form--errors';
      const list = document.createElement('ul');
      errors.form.forEach((message: string) => {
        const item = document.createElement('li');
        item.textContent = this.translateMessage(message, catalog);
        list.appendChild(item);
      });
      container.appendChild(list);
      form.prepend(container);
    }

    if (errors.fields && typeof errors.fields === 'object') {
      Object.entries(errors.fields).forEach(([fieldName, messages]) => {
        const field = form.querySelector(
          `[name="${fieldName}"]`
        ) as HTMLElement | null;
        if (!field) {
          return;
        }

        const group = field.closest('.form--group');
        if (group) {
          group.classList.add('has-error');
        }

        const errorContainer = document.createElement('div');
        errorContainer.className = 'form--field-errors';
        const list = document.createElement('ul');

        (messages as string[]).forEach((message: string) => {
          const item = document.createElement('li');
          item.textContent = this.translateMessage(message, catalog);
          list.appendChild(item);
        });

        errorContainer.appendChild(list);

        if (group) {
          group.appendChild(errorContainer);
        } else {
          field.parentElement?.appendChild(errorContainer);
        }
      });
    }
  }

  private clearFormErrors(form: HTMLFormElement) {
    form.querySelectorAll('.form--errors').forEach((node) => node.remove());
    form
      .querySelectorAll('.form--field-errors')
      .forEach((node) => node.remove());
    form
      .querySelectorAll('.has-error')
      .forEach((node) => node.classList.remove('has-error'));
  }

  private translateMessage(
    message: string,
    catalog?: Record<string, string>
  ): string {
    if (!message) {
      return message;
    }

    if (catalog && this.app.services.locale) {
      return this.app.services.locale.trans(message, {}, catalog);
    }

    return message;
  }
}
