import RenderDataInterface from './RenderDataInterface';
import PageInterface from './PageInterface';

export default interface LayoutInterface extends RenderDataInterface {
  body?: null | string;
  templates: string;
  env: string;
  page: PageInterface;
  vueTemplates?: string[];
}
