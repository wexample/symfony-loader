import AssetsService from '../services/AssetsService';
import AdaptiveService from '../services/AdaptiveService';
import EventsService from '../services/EventsService';
import LayoutsService from '../services/LayoutsService';
import MixinsService from '../services/MixinsService';
import PagesService from '../services/PagesService';
import PromptService from '../services/PromptsService';
import RoutingService from '../services/RoutingService';
import ComponentsService from '../services/ComponentsService';
import VueService from '../services/VueService';
import DebugService from '../services/DebugService';
import LocaleService from '../services/LocaleService';

export default interface ServicesRegistryInterface {
  adaptive?: AdaptiveService;
  assets?: AssetsService;
  components?: ComponentsService;
  debug?: DebugService;
  events?: EventsService;
  layouts?: LayoutsService;
  locale?: LocaleService;
  mixins?: MixinsService;
  pages?: PagesService;
  prompt?: PromptService;
  routing?: RoutingService;
  vue?: VueService;
}
