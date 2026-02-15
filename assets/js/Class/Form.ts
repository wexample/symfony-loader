import Component from './Component';
import AdaptiveService from '../Services/AdaptiveService';
import LocaleService from '../Services/LocaleService';
import AdaptiveResponseInterface from '../Interfaces/AdaptiveResponseInterface';
import FormResponsePayloadInterface from '../Interfaces/FormResponsePayloadInterface';
import RequestOptionsInterface from "../Interfaces/RequestOptions/RequestOptionsInterface";
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';

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
      await this.handleEmbeddedSubmit(adaptiveService, action, formData);
      return;
    }

    const data = (await adaptiveService.requestData(action, {
      method: 'POST',
      body: formData,
    } as any)) as FormResponsePayloadInterface;

    if (!data || data.ok === false) {
      this.applyPayloadErrors(data);
      return;
    }

    if (this.handleRedirect(data.action)) {
      return;
    }

    if (data.action) {
      this.handleSuccessAction(data.action);
    }

    await this.closeEmbed();
  }

  protected handleSuccessAction(action: any) {
  }

  private async handleEmbeddedSubmit(
    adaptiveService: AdaptiveService,
    action: string,
    formData: FormData
  ): Promise<void> {
    const data = (await adaptiveService.requestData(action, {
      method: 'POST',
      body: formData,
      instant: true
    } as any)) as AdaptiveResponseInterface;

    if (!data) {
      return;
    }

    if (data.responseType === 'render') {
      const renderData = data as RenderDataInterface;
      if (renderData.ok === false) {
        return;
      }
      await this.closeEmbed();
      await adaptiveService.handleRenderData(renderData, {
        callerPage: this.app.layout.pageFocused,
        instant: true,
      } as RequestOptionsInterface);
      return;
    }

    const payload = data as FormResponsePayloadInterface;

    if (this.handleRedirect(payload.action)) {
      return;
    }

    if (payload.ok === false) {
      this.applyPayloadErrors(payload);
      return;
    }

    if (payload.action?.type === 'no_action') {
      await this.closeEmbed();
      return;
    }

    await this.closeEmbed();
  }

  private async closeEmbed(): Promise<void> {
    await this.trigger('embed:close', {
      source: this,
      embedType: this.options.embedType,
      instant: true,
    });
  }

  private handleRedirect(action: any): boolean {
    if (action?.type === 'redirect' && action?.url) {
      window.location.href = action.url;
      return true;
    }

    return false;
  }

  private applyPayloadErrors(payload?: FormResponsePayloadInterface | null): void {
    if (!payload?.form?.errors) {
      return;
    }

    const catalog = payload.translations
      ? {...this.app.layout.translations, ...payload.translations}
      : undefined;
    this.applyFormErrors(this.el as HTMLFormElement, payload.form.errors, catalog);
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
