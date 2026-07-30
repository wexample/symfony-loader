import Page from '../../Class/Page';

export default interface RequestOptionsInterface {
  body?: BodyInit;
  callerPage?: Page;
  destPage?: Page;
  headers?: any;
  instant?: boolean;
  layout?: string;
  method?: string;
}
