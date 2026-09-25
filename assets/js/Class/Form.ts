import Component from './Component';
import AdaptiveService from '../Services/AdaptiveService';
import LocaleService from '../Services/LocaleService';
import ToastService from '../Services/ToastService';
import AdaptiveResponseInterface from '../Interfaces/AdaptiveResponseInterface';
import FormResponsePayloadInterface from '../Interfaces/FormResponsePayloadInterface';
import RequestOptionsInterface from "../Interfaces/RequestOptions/RequestOptionsInterface";
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import {
  ACTION_DEFAULT,
  ACTION_EMBED_REDIRECT,
  ACTION_REDIRECT,
} from '../Constants/FormActions';
import {
  FORM_FIELD_COLLECT,
  FORM_FIELD_REGISTER,
  FORM_FIELD_UNREGISTER,
  formSuccessEvent,
} from '../Constants/FormEvents';
import type { FieldControllerInterface } from '@wexample/js-api/Vue/FieldControllerInterface';
import type { FieldRegistryInterface } from '@wexample/js-api/Vue/FieldRegistryInterface';

export default class Form extends Component implements FieldRegistryInterface {
  // The fields this form answers for, by name. What lets something ask for a
  // field without knowing the page.
  private readonly fields: Map<string, FieldControllerInterface> = new Map();
  private onFieldRegisterProxy?: EventListener;
  private onFieldUnregisterProxy?: EventListener;
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

    this.onFieldRegisterProxy = (event: Event) => {
      const field = (event as CustomEvent).detail?.field as FieldControllerInterface;

      if (field) {
        this.registerField(field);
      }
    };
    this.onFieldUnregisterProxy = (event: Event) => {
      const field = (event as CustomEvent).detail?.field as FieldControllerInterface;

      if (field) {
        this.unregisterField(field);
      }
    };

    this.el.addEventListener(FORM_FIELD_REGISTER, this.onFieldRegisterProxy);
    this.el.addEventListener(FORM_FIELD_UNREGISTER, this.onFieldUnregisterProxy);

    // Whoever was ready before this form did not find it: they are asked now.
    this.el.dispatchEvent(new CustomEvent(FORM_FIELD_COLLECT, { bubbles: true }));
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

    if (this.onFieldRegisterProxy) {
      this.el.removeEventListener(FORM_FIELD_REGISTER, this.onFieldRegisterProxy);
    }

    if (this.onFieldUnregisterProxy) {
      this.el.removeEventListener(FORM_FIELD_UNREGISTER, this.onFieldUnregisterProxy);
    }

    this.fields.clear();
  }

  public registerField(field: FieldControllerInterface): void {
    if (field.fieldName) {
      this.fields.set(field.fieldName, field);
    }
  }

  public unregisterField(field: FieldControllerInterface): void {
    this.fields.delete(field.fieldName);
  }

  public getField(name: string): FieldControllerInterface | undefined {
    return this.fields.get(name);
  }

  public getFields(): FieldControllerInterface[] {
    return [...this.fields.values()];
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
    const submitter = (event as any).submitter as HTMLInputElement | HTMLButtonElement | null;

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
      // Native form submission: browser collects data and navigates.
      // Do not call beginSubmit here — loading:start would fire during
      // the submit event and disable fields before the browser reads them.
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
    })) as FormResponsePayloadInterface;

    if (!data || data.ok === false) {
      this.applyPayloadErrors(data);
      return;
    }

    this.showPayloadNotification(data);
    await this.triggerSuccess(data);

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
    })) as AdaptiveResponseInterface;

    if (!data) {
      return;
    }

    if (data.responseType === 'render') {
      const renderData = data as RenderDataInterface;
      if (renderData.ok === false) {
        return;
      }
      if (this.announceNavigation({ renderData })) {
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

    this.showPayloadNotification(payload);
    await this.triggerSuccess(payload);

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

  // Asks whoever holds the form whether it takes the navigation: true when a
  // page manager did, false when nobody answered.
  private announceNavigation(detail: { url?: string; renderData?: RenderDataInterface }): boolean {
    const event = new CustomEvent('page:navigate', {
      bubbles: true,
      cancelable: true,
      detail,
    });

    this.el.dispatchEvent(event);

    return event.defaultPrevented;
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

    // The page manager holding the form takes the next page itself when the
    // page asked to keep its navigation — a tunnel moving to its next step
    // inside the modal it was opened in, rather than closing it.
    if (this.announceNavigation({ url: action.url })) {
      this.triggerLoadingEnd();
      return true;
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

  // Triggered before any embed closing, so the event still bubbles
  // from the form element up to the document.
  private async triggerSuccess(
    payload?: FormResponsePayloadInterface | null
  ): Promise<void> {
    if (!payload?.form?.name || payload.ok === false) {
      return;
    }

    await this.trigger(formSuccessEvent(payload.form.name), { payload });
  }

  private showPayloadNotification(
    payload?: FormResponsePayloadInterface | null
  ): void {
    if (!payload?.notification || payload.ok === false) {
      return;
    }

    (this.app.getServiceOrFail(ToastService) as ToastService).show({
      type: payload.notification.type,
      message: this.trans(payload.notification.message),
    });
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
