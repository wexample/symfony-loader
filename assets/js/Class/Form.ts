import Component from './Component';
import AdaptiveService from '../Services/AdaptiveService';
import LocaleService from '../Services/LocaleService';
import FormResponsePayloadInterface from '../Interfaces/FormResponsePayloadInterface';
import RequestOptionsInterface from "../Interfaces/RequestOptions/RequestOptionsInterface";

export default class Form extends Component {
  private onSubmitProxy: EventListener;

  protected async activateListeners(): Promise<void> {
    await super.activateListeners();

    this.onSubmitProxy = this.onSubmit.bind(this);
    this.el.addEventListener('submit', this.onSubmitProxy);
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.onSubmitProxy) {
      this.el.removeEventListener('submit', this.onSubmitProxy);
    }
  }

  protected onBeforeSubmit(
    _event: SubmitEvent,
    _form: HTMLFormElement,
    _formData: FormData,
    _submitter: HTMLInputElement | HTMLButtonElement | null
  ): boolean {
    return true;
  }

  private async onSubmit(event: SubmitEvent) {
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const submitter = (event as any).submitter as
      | HTMLInputElement
      | HTMLButtonElement
      | null;

    if (submitter?.name) {
      formData.append(submitter.name, 'true');
    }

    if (this.onBeforeSubmit(event, form, formData, submitter) === false) {
      event.preventDefault();
      return;
    }

    const action =
      form.getAttribute('action') ||
      window.location.pathname +
      window.location.search +
      (window.location.hash || '');

    const isEmbedded = this.options?.embedType && this.options.embedType !== 'default';

    if (!this.options?.ajax && !isEmbedded) {
      return;
    }

    event.preventDefault();

    await this.submitAdaptive(action, formData, isEmbedded);
  }

  private async submitAdaptive(
    action: string,
    formData: FormData,
    isEmbedded?: boolean
  ) {
    const adaptiveService = this.app.getServiceOrFail(AdaptiveService) as AdaptiveService;
    if (isEmbedded) {
      const data = (await adaptiveService.requestData(action, {
        method: 'POST',
        body: formData,
        instant: true
      } as any)) as FormResponsePayloadInterface;

      if (!data || data.ok === false) {
        if (data?.form?.errors) {
          const catalog = data.translations
            ? {...this.app.layout.translations, ...data.translations}
            : undefined;
          this.applyFormErrors(this.el as HTMLFormElement, data.form.errors, catalog);
        }
        return;
      }

      if (data.action?.type === 'redirect' && data.action?.url) {
        window.location.href = data.action.url;
        return;
      }

      if (data.action?.type === 'no_action') {
        await this.trigger('embed:close', {
          source: this,
          embedType: this.options.embedType,
          instant: true,
        });
        return;
      }

      if (hasErrors === true) {
        await adaptiveService.handleRenderData(data, {
      if (data.render) {
        await adaptiveService.handleRenderData(data.render, {
          callerPage: this.app.layout.pageFocused,
          instant: true,
        } as RequestOptionsInterface);
        return;
      }

      await this.trigger('embed:close', {
        source: this,
        embedType: this.options.embedType,
        instant: true,
      });

      return;
    }

    const data = (await adaptiveService.requestData(action, {
      method: 'POST',
      body: formData,
    } as any)) as FormResponsePayloadInterface;

    if (!data || data.ok === false) {
      if (data?.form?.errors) {
        const catalog = data.translations
          ? {...this.app.layout.translations, ...data.translations}
          : undefined;
        this.applyFormErrors(this.el as HTMLFormElement, data.form.errors, catalog);
      }
      return;
    }

    if (data.action?.type === 'redirect' && data.action?.url) {
      window.location.href = data.action.url;
      return;
    }

    if (data.action) {
      this.handleSuccessAction(data.action);
    }

    await this.trigger('embed:close', {
      source: this,
      embedType: this.options.embedType,
      instant: true,
    });
  }

  protected handleSuccessAction(action: any) {
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

    const localeService = this.app.getServiceOrFail(LocaleService) as LocaleService;
    if (catalog && localeService) {
      return localeService.trans(message, {}, catalog);
    }

    return message;
  }
}
