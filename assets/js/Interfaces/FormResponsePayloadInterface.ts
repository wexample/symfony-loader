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

export default interface FormResponsePayloadInterface extends AdaptiveResponseInterface {
  ok: boolean;
  form?: FormInfoInterface;
  translations?: Record<string, string>;
  action?: FormActionInterface;
  render?: RenderDataInterface | null;
}
