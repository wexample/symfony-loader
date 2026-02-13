import Page from '../../Class/Page';

export default interface RequestOptionsInterface {
  callerPage?: Page;
  destPage?: Page;
  headers?: any;
  instant?: boolean;
  layout?: string;
  method?: string;
}
