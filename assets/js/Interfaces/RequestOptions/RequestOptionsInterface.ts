import Page from '../../Class/Page';

export default interface RequestOptionsInterface {
  headers?: any;
  callerPage?: Page;
  layout?: string;
  destPage?: Page;
}
