import AppService from '../Class/AppService';
import PageManagerComponent from '../Class/PageManagerComponent';
import RequestOptionsInterface from '../Interfaces/RequestOptions/RequestOptionsInterface';
import InvariantViolationError from '../Errors/InvariantViolationError';
import PagesService from './PagesService';

export default class EmbedService extends AppService {
  public static dependencies: typeof AppService[] = [PagesService];
  public static serviceName: string = 'embeds';

  // A modal or a panel is the one of its kind on the page and is found by its
  // layout base. An embed is not: a page can hold several, so each says which
  // one it is and what fills it names the one it means.
  private embeds: { [name: string]: PageManagerComponent } = {};

  register(name: string, embed: PageManagerComponent) {
    this.embeds[name] = embed;
  }

  unregister(name: string) {
    delete this.embeds[name];
  }

  load(
    name: string,
    path: string,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<any> {
    const embed = this.embeds[name];

    if (!embed) {
      throw new InvariantViolationError({
        message: `No embed named "${name}" on this page.`,
        code: 'ERR_EMBED_NOT_FOUND',
        context: { name, available: Object.keys(this.embeds) },
      });
    }

    const separator = path.includes('?') ? '&' : '?';

    // destPage sends the rendered page to this embed instead of the manager the
    // layout base would otherwise designate, which is what lets two embeds live
    // on the same page.
    return this.app.services.adaptive.get(`${path}${separator}__layout=embed`, {
      ...requestOptions,
      destPage: embed,
    });
  }
}
