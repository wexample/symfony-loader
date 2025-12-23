import AppService from '../class/AppService';
import { format as StringFormat } from '../helpers/StringHelper';

export type RenderNodeLocaleType = {
  trans?: Function;
};

export default class LocaleService extends AppService {
  public static serviceName: string = 'locale';

  registerMethods() {
    return {
      renderNode: {
        trans(string: string = '', args: {} = {}, catalog?: object) {
          catalog = catalog || {
            ...this.app.layout.translations,
            ...this.translations,
          };

          return this.app.services.locale.trans(string, args, catalog);
        },
      },
      vue: {
        methods: {
          trans(string: string = '', args: {} = {}, catalog?: object) {
            return this.rootComponent.trans.call(
              this.rootComponent,
              string,
              args,
              catalog || this.translations
            );
          },
        },
      },
    };
  }

  trans(
    string: string = '',
    args: {} = {},
    catalog: object = this.app.layout.translations
  ) {
    return StringFormat(catalog[string] || string, args);
  }
}
