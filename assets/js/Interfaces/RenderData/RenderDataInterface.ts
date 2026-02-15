import AdaptiveResponseInterface from '../AdaptiveResponseInterface';
import AssetsCollectionInterface from '../AssetsCollectionInterface';
import ComponentInterface from './ComponentInterface';
import RequestOptionsInterface from '../RequestOptions/RequestOptionsInterface';

export default interface RenderDataInterface extends AdaptiveResponseInterface {
  assets: null | AssetsCollectionInterface;
  components: ComponentInterface[];
  contextType: string;
  cssClassName: string;
  id: string;
  ok: false;
  options: any;
  redirect?: { url?: string };
  action?: any;
  form?: { errors?: any };
  renderRequestId?: string;
  requestOptions?: RequestOptionsInterface;
  translations: {};
  translationDomains: { [alias: string]: { [view: string]: string } | string };
  vars: {[key: string]: any};
  view: string;
  usages: {};
}
