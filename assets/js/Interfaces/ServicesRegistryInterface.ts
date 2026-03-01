import AssetsService from '../Services/AssetsService';
import AdaptiveService from '../Services/AdaptiveService';
import EventsService from '../Services/EventsService';
import LayoutsService from '../Services/LayoutsService';
import MixinsService from '../Services/MixinsService';
import PagesService from '../Services/PagesService';
import PromptService from '../Services/PromptsService';
import RoutingService from '../Services/RoutingService';
import ComponentsService from '../Services/ComponentsService';
import VueService from '../Services/VueService';
import DebugService from '../Services/DebugService';
import LocaleService from '../Services/LocaleService';
import EntityService from '../Services/EntityService';
import OverlayService from '../Services/OverlayService';
import KeyboardService from '../Services/KeyboardService';
import LiveUpdatesService from '../Services/LiveUpdatesService';

export default interface ServicesRegistryInterface {
  adaptive?: AdaptiveService;
  assets?: AssetsService;
  components?: ComponentsService;
  debug?: DebugService;
  entity?: EntityService;
  keyboard?: KeyboardService;
  events?: EventsService;
  layouts?: LayoutsService;
  locale?: LocaleService;
  liveUpdates?: LiveUpdatesService;
  mixins?: MixinsService;
  overlay?: OverlayService;
  pages?: PagesService;
  prompt?: PromptService;
  routing?: RoutingService;
  vue?: VueService;
}
