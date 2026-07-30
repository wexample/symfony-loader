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

export interface FormNotificationInterface {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export default interface FormResponsePayloadInterface extends AdaptiveResponseInterface {
  ok: boolean;
  form: FormInfoInterface;
  translations?: Record<string, string>;
  notification?: FormNotificationInterface;
  action: FormActionInterface;
  render?: RenderDataInterface | null;
}
