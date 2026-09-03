import Page from '../../Class/Page';
import PageManagerComponent from '../../Class/PageManagerComponent';

export default interface RequestOptionsInterface {
  body?: BodyInit;
  callerPage?: Page;
  // Which manager receives the rendered page, when it is not the one the layout
  // base designates.
  destPage?: PageManagerComponent;
  headers?: any;
  instant?: boolean;
  layout?: string;
  method?: string;
}
