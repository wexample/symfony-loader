import Page from '../../class/Page';

export default interface RequestOptionsInterface {
  headers?: any;
  callerPage?: Page;
  layout?: string;
  destPage?: Page;
}
