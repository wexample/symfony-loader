import Page from '../../Class/Page';

export default interface RequestOptionsInterface {
  headers?: any;
  method?: string;
  callerPage?: Page;
  layout?: string;
  destPage?: Page;
}
