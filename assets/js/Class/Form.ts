import Component from './Component';
import AdaptiveService from '../Services/AdaptiveService';
import LocaleService from '../Services/LocaleService';
import AdaptiveResponseInterface from '../Interfaces/AdaptiveResponseInterface';
import FormResponsePayloadInterface from '../Interfaces/FormResponsePayloadInterface';
import RequestOptionsInterface from "../Interfaces/RequestOptions/RequestOptionsInterface";
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import {
  ACTION_DEFAULT,
  ACTION_EMBED_REDIRECT,
  ACTION_REDIRECT,
} from '../Constants/FormActions';

export default class Form extends Component {
  private onSubmitProxy: EventListener;
  private isSubmitting = false;
  private lastSubmitter: HTMLInputElement | HTMLButtonElement | null = null;
  private loadingEnded = false;
  private isDirty = false;
  private onDirtyProxy?: EventListener;

  protected async activateListeners(): Promise<void> {
    await super.activateListeners();

    this.onSubmitProxy = this.onSubmit.bind(this);
    this.el.addEventListener('submit', this.onSubmitProxy);

    this.onDirtyProxy = this.onDirty.bind(this);
    this.el.addEventListener('change', this.onDirtyProxy);
    this.el.addEventListener('input', this.onDirtyProxy);
  }

  protected async deactivateListeners(): Promise<void> {
    await super.deactivateListeners();

    if (this.onSubmitProxy) {
      this.el.removeEventListener('submit', this.onSubmitProxy);
    }

    if (this.onDirtyProxy) {
      this.el.removeEventListener('change', this.onDirtyProxy);
      this.el.removeEventListener('input', this.onDirtyProxy);
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

    if (this.isSubmitting) {
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
      this.beginSubmit(form, submitter);
      return;
    }

    event.preventDefault();

    this.beginSubmit(form, submitter);
    try {
      await this.submitAdaptive(action, formData, isEmbedded);
    } finally {
      this.endSubmit();
    }
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

    if (await this.handleEmbeddedRedirect(payload.action, adaptiveService)) {
      return;
    }

    if (payload.ok === false) {
      this.applyPayloadErrors(payload);
      return;
    }

    if (this.shouldCloseEmbed(payload)) {
      await this.closeEmbed(false);
    }
  }

  protected shouldCloseEmbed(payload: FormResponsePayloadInterface): boolean {
    return payload?.action?.type === ACTION_DEFAULT;
  }

  protected beginSubmit(
    form: HTMLFormElement,
    submitter: HTMLInputElement | HTMLButtonElement | null
  ): void {
    this.isSubmitting = true;
    this.loadingEnded = false;
    this.setSubmitDisabled(submitter, true);
    this.trigger('loading:start', { source: this });
  }

  protected endSubmit(): void {
    this.isSubmitting = false;
    this.setSubmitDisabled(this.lastSubmitter, false);
    this.lastSubmitter = null;
    this.triggerLoadingEnd();
  }

  protected setSubmitDisabled(
    submitter: HTMLInputElement | HTMLButtonElement | null,
    disabled: boolean
  ): void {
    if (!submitter) {
      return;
    }

    this.lastSubmitter = submitter;
    submitter.disabled = disabled;
  }

  private async closeEmbed(instant: boolean = true): Promise<void> {
    await this.trigger('embed:close', {
      source: this,
      embedType: this.options.embedType,
      instant: instant,
    });
  }

  private triggerLoadingEnd(): void {
    if (this.loadingEnded) {
      return;
    }

    this.loadingEnded = true;
    this.trigger('loading:end', { source: this });
  }

  private onDirty(): void {
    if (this.isDirty) {
      return;
    }

    this.isDirty = true;
    this.trigger('form:dirty', { source: this, dirty: true });
  }

  private async handleEmbeddedRedirect(
    action: any,
    adaptiveService: AdaptiveService
  ): Promise<boolean> {
    if (action?.type !== ACTION_EMBED_REDIRECT || !action?.url) {
      return false;
    }

    this.triggerLoadingEnd();
    await adaptiveService.get(action.url, {
      callerPage: this.app.layout.pageFocused,
      instant: true,
    } as RequestOptionsInterface);
    await this.closeEmbed(true);
    return true;
  }

  private handleRedirect(action: any): boolean {
    if (action?.type === ACTION_REDIRECT && action?.url) {
      window.location.href = action.url;
      return true;
    }

    return false;
  }

  private applyPayloadErrors(payload?: FormResponsePayloadInterface | null): void {
    if (!payload?.form?.errors) {
      return;
    }

    this.applyFormErrors(
      this.el as HTMLFormElement,
      payload.form.errors,
      payload.translations
    );
  }

  private applyFormErrors(
    form: HTMLFormElement,
    errors: any,
    catalog: Record<string, string>
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
    catalog: Record<string, string>
  ): string {
    return (this.app.getServiceOrFail(LocaleService) as LocaleService).trans(message, {}, catalog);
  }
}
