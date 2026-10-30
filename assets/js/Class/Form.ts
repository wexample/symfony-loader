import AgentNavigation from './AgentNavigation';
import Component from './Component';
import type { AgentActionsImplementation } from '../Interfaces/AgentNodeInterface';
import type { AgentCallContext } from '../Interfaces/AgentToolInterface';
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
  FORM_ABANDONED,
  FORM_FIELD_COLLECT,
  FORM_FIELD_REGISTER,
  FORM_FIELD_UNREGISTER,
  FORM_INVALID,
  FORM_OPENED,
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
  // Sent and accepted, or handed to the browser to send: not abandoned.
  private isSent = false;
  private onDirtyProxy?: EventListener;

  protected async activateListeners(): Promise<void> {
    await super.activateListeners();

    this.onSubmitProxy = this.onSubmit.bind(this);
    this.el.addEventListener('submit', this.onSubmitProxy);

    this.onDirtyProxy = this.onDirty.bind(this);
    this.el.addEventListener('change', this.onDirtyProxy);
    this.el.addEventListener('input', this.onDirtyProxy);

    if (this.submitsWhenValid) {
      this.el.addEventListener('input', this.updateSubmittable);
      this.el.addEventListener('change', this.updateSubmittable);
      this.updateSubmittable();
    }

    if (this.submitsOnChange) {
      this.el.addEventListener('change', this.submitOnChange);
    }

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

    window.addEventListener('pagehide', this.onPageHide);
    this.tell(FORM_OPENED);
  }

  protected async deactivateListeners(): Promise<void> {
    // Before the listeners go: the form is still in the page, its event
    // still bubbles to the document.
    this.tellIfAbandoned();
    window.removeEventListener('pagehide', this.onPageHide);

    await super.deactivateListeners();

    if (this.onSubmitProxy) {
      this.el.removeEventListener('submit', this.onSubmitProxy);
    }

    if (this.onDirtyProxy) {
      this.el.removeEventListener('change', this.onDirtyProxy);
      this.el.removeEventListener('input', this.onDirtyProxy);
    }

    this.el.removeEventListener('input', this.updateSubmittable);
    this.el.removeEventListener('change', this.updateSubmittable);
    this.el.removeEventListener('change', this.submitOnChange);

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

    this.logAgentEvent(`Submitted the form${this.getAgentLabel() ? ` "${this.getAgentLabel()}"` : ''}`, { key: 'submit' });

    if (!this.options?.ajax && !isEmbedded) {
      this.isSent = true;
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

    // Said to come from a page: a script's request without it is taken for a
    // modal's, and the server would answer with a move inside an embed there
    // is none of — a tunnel's step going on to the next one.
    const pageAction = new URL(action, window.location.href);
    pageAction.searchParams.set('__layout', 'default');

    const data = (await adaptiveService.requestData(pageAction.pathname + pageAction.search, {
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
    this.updateSubmittable();
    this.triggerLoadingEnd();
  }

  // A form saying so (`submit_when_valid`) holds its submit buttons until
  // every field holds a valid value, as the browser checks it — read on each
  // control's `validity`, which raises no `invalid` event and so shows no
  // error before the form is sent.
  private get submitsWhenValid(): boolean {
    return (this.el as HTMLFormElement).dataset.submitWhenValid !== undefined;
  }

  // A form saying so (`submit_on_change`) is sent as soon as one of its
  // controls settles on a new value — a bar steering a view, which holds no
  // submit button to press. `change` and not `input`: a range fires once
  // released, so a move costs one request and not one per step.
  private get submitsOnChange(): boolean {
    return (this.el as HTMLFormElement).dataset.submitOnChange !== undefined;
  }

  // No submitter: nothing was pressed. `requestSubmit` and not `submit`, so
  // the submit event is raised and the form goes the same way as any other —
  // in ajax when it is an ajax form, by navigation otherwise.
  private submitOnChange = (): void => {
    if (this.isSubmitting) {
      return;
    }

    (this.el as HTMLFormElement).requestSubmit();
  };

  private updateSubmittable = (): void => {
    if (!this.submitsWhenValid || this.isSubmitting) {
      return;
    }

    const elements = Array.from((this.el as HTMLFormElement).elements) as HTMLInputElement[];
    const valid = elements.every((element) => element.disabled || !element.validity || element.validity.valid);

    elements
      .filter((element) => element.type === 'submit')
      .forEach((button) => {
        button.disabled = !valid;
      });
  };

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

  // Its name, which the server knows it by; its id when it has none.
  private get formName(): string {
    return this.el.getAttribute('name') || this.el.id;
  }

  // What an agent reads and does (`components/form.ai.yml`). The fields are
  // nodes of their own: here, the form as a whole — filled in order, sent,
  // and what came back.
  public getAgentLabel(): string | undefined {
    return this.el.getAttribute('aria-label')
      || this.el.querySelector<HTMLElement>('legend, .form--title')?.textContent?.trim()
      || this.formName
      || undefined;
  }

  public getAgentState(): Record<string, any> {
    const errors = this.readFormErrors();

    return {
      name: this.formName,
      fields: [...this.fields.keys()],
      // Changed and not sent: what is written is not saved until `submit`.
      unsaved: this.isDirty && !this.isSent,
      ...(errors.length ? { errors } : {}),
    };
  }

  public getAgentActions(): AgentActionsImplementation {
    return {
      fill: async ({ values }) => {
        const filled: string[] = [];
        const unknown: string[] = [];

        for (const [name, value] of Object.entries(values ?? {})) {
          const field = this.getField(name) ?? this.findFieldByLabel(name);

          if (!field) {
            unknown.push(name);
            continue;
          }

          // One after the other, as a person fills a form.
          await field.setValueAssisted(value);
          filled.push(field.fieldName);
        }

        if (unknown.length) {
          throw new Error(`No field ${unknown.map((name) => `"${name}"`).join(', ')} in the form: ${[...this.fields.keys()].join(', ')}.`);
        }

        return { filled, saved: false };
      },
      submit: (_args, context) => this.submitForAgent(context),
      errors: () => ({
        form: this.readFormErrors(),
        fields: Object.fromEntries([...this.fields.values()]
          .map((field) => [field.fieldName, this.readFieldErrors(field.fieldName)])
          .filter(([, errors]) => errors.length)),
      }),
    };
  }

  // A field named by what the reader sees — its label — as well as by name.
  private findFieldByLabel(label: string): FieldControllerInterface | null {
    const wanted = String(label).toLowerCase();

    for (const field of this.fields.values()) {
      const named = (field as any).getAgentLabel?.();

      if (typeof named === 'string' && named.toLowerCase() === wanted) {
        return field;
      }
    }

    return null;
  }

  // Sent as its button sends it — pressed as the agent presses a button,
  // when the button is a node of its own: the user sees the press, and a
  // confirmation is asked first. Answered in place — ajax, or embedded —,
  // the answer is what the form was told; leaving the page, it comes from
  // the page reached.
  private async submitForAgent(context?: AgentCallContext): Promise<AgentNavigation | Record<string, any>> {
    const form = this.el as HTMLFormElement;
    const submitter = Array.from(form.elements).find((element) => (element as HTMLInputElement).type === 'submit') as HTMLButtonElement | undefined;
    const isEmbedded = this.options?.embedType && this.options.embedType !== 'default';
    const press = await this.pressSubmitter(submitter, context);

    if (press && !(press instanceof AgentNavigation)) {
      return { submitted: this.formName, refused: true };
    }

    const send = () => (press ? press.go() : form.requestSubmit(submitter));

    if (!this.options?.ajax && !isEmbedded) {
      return new AgentNavigation(send, { submitted: this.formName });
    }

    return new Promise((resolve) => {
      const done = () => {
        this.el.removeEventListener('loading:end', done);
        resolve({
          submitted: this.formName,
          ...(this.readFormErrors().length || this.hasFieldErrors() ? { errors: (this.getAgentActions().errors as () => any)() } : {}),
        });
      };

      this.el.addEventListener('loading:end', done);
      send();
    });
  }

  // The button pressed the way its own node presses it, when it has one
  // with a `click`: the press to run (AgentNavigation), or what the button
  // answered instead — a confirmation refused. Null when the button has no
  // node: the form sends itself.
  private async pressSubmitter(submitter: HTMLButtonElement | undefined, context?: AgentCallContext): Promise<AgentNavigation | Record<string, any> | null> {
    const click = this.app.services.agentTools?.nodeFor(submitter)?.getAgentActions().click;

    if (!click) {
      return null;
    }

    const pressed = await click({}, context);

    return pressed instanceof AgentNavigation || pressed?.refused ? pressed : null;
  }

  private readFormErrors(): string[] {
    return Array.from(this.el.querySelectorAll(':scope > .form--errors li'))
      .map((item) => item.textContent?.trim() ?? '')
      .filter(Boolean);
  }

  private readFieldErrors(name: string): string[] {
    const control = this.el.querySelector(`[name="${CSS.escape(name)}"]`);
    const group = control?.closest('.form--group');

    return Array.from(group?.querySelectorAll('.form--field-errors li') ?? [])
      .map((item) => item.textContent?.trim() ?? '')
      .filter(Boolean);
  }

  private hasFieldErrors(): boolean {
    return [...this.fields.keys()].some((name) => this.readFieldErrors(name).length > 0);
  }

  private tell(eventName: string, detail: Record<string, unknown> = {}): void {
    this.el.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      detail: { form: this.formName, ...detail },
    }));
  }

  private tellIfAbandoned(): void {
    if (this.isDirty && !this.isSent) {
      this.tell(FORM_ABANDONED);
      // Told once: leaving the page after closing the form is not a second abandon.
      this.isSent = true;
    }
  }

  private onPageHide = (): void => {
    this.tellIfAbandoned();
  };

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

    this.isSent = true;
    await this.trigger(formSuccessEvent(payload.form.name), { payload });
  }

  private showPayloadNotification(
    payload?: FormResponsePayloadInterface | null
  ): void {
    if (!payload?.notification || payload.ok === false) {
      return;
    }

    const action = payload.notification.action;

    (this.app.getServiceOrFail(ToastService) as ToastService).show({
      type: payload.notification.type,
      message: this.trans(payload.notification.message),
      ...(action ? { action: { ...action, label: this.trans(action.label) } } : {}),
    });
  }

  private applyPayloadErrors(payload?: FormResponsePayloadInterface | null): void {
    if (!payload?.form?.errors) {
      return;
    }

    this.tell(FORM_INVALID, { fields: Object.keys(payload.form.errors.fields ?? {}) });

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
