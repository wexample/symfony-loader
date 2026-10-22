export const FORM_SUCCESS = 'form:success';

export function formSuccessEvent(formName: string): string {
  return `${FORM_SUCCESS}:${formName}`;
}

/**
 * What a form goes through, told for whoever keeps track of it — symfony-activity-ds
 * reports them. Each bubbles from the form with `{ form }`, its name; `form:invalid`
 * adds `fields`, the names the server refused, never what was typed in them.
 */
export const FORM_OPENED = 'form:opened';
export const FORM_INVALID = 'form:invalid';
// Changed, then left without being sent: closed, navigated away from, the page gone.
export const FORM_ABANDONED = 'form:abandoned';

/**
 * The handshake between a form and the fields inside it.
 *
 * Neither can wait for the other: a field may be ready before its form, or after
 * it. So a field announces itself as it activates, and a form asks once it is
 * ready — whichever comes second finds the first. Both events bubble, which is
 * how a form reaches the fields under it without knowing where they are.
 */
export const FORM_FIELD_REGISTER = 'form-field:register';
export const FORM_FIELD_UNREGISTER = 'form-field:unregister';
export const FORM_FIELD_COLLECT = 'form-field:collect';
