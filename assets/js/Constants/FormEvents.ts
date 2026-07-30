export const FORM_SUCCESS = 'form:success';

export function formSuccessEvent(formName: string): string {
  return `${FORM_SUCCESS}:${formName}`;
}
