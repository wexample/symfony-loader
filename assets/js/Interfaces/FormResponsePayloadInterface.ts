import AdaptiveResponseInterface from './AdaptiveResponseInterface';
import RenderDataInterface from './RenderData/RenderDataInterface';

export interface FormErrorsInterface {
  form: string[];
  fields: Record<string, string[]>;
  count: number;
}

export interface FormInfoInterface {
  name: string;
  errors: FormErrorsInterface;
}

export interface FormActionInterface {
  type: string;
  [key: string]: any;
}

// What to do next, drawn as a button in the toast: `target` opens `href`
// where a target button would (`panel`, `modal`).
export interface NotificationActionInterface {
  label: string;
  href: string;
  icon?: string;
  target?: string;
}

export interface FormNotificationInterface {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: NotificationActionInterface;
}

export default interface FormResponsePayloadInterface extends AdaptiveResponseInterface {
  ok: boolean;
  form: FormInfoInterface;
  translations?: Record<string, string>;
  notification?: FormNotificationInterface;
  action: FormActionInterface;
  render?: RenderDataInterface | null;
}
