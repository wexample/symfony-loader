import AppService from '../Class/AppService';
import { stringFormat } from '@wexample/js-helpers/Helper/String';

export type RenderNodeLocaleType = {
  trans?: Function;
};

export default class LocaleService extends AppService {
  public static serviceName: string = 'locale';

  private mergeCatalog(
    catalog: object | undefined,
    nodeTranslations: object
  ): object {
    return catalog || {
      ...this.app.layout.translations,
      ...nodeTranslations,
    };
  }

  private resolveAlias(
    key: string,
    domainsMap: any,
    view: string | undefined
  ): string {
    const prefix = this.app.layout.vars.translatorDomainPrefix;
    const separator = this.app.layout.vars.translatorDomainSeparator;

    const alias = key.startsWith(prefix) && key.includes(separator)
      ? key.substring(prefix.length, key.indexOf(separator))
      : null;

    if (alias && domainsMap?.[alias]) {
      const entry = domainsMap[alias] as any;
      const domain = entry?.[view] || Object.values(entry)[0];

      if (domain) {
        return key.replace(`${prefix}${alias}${separator}`, `${domain}${separator}`);
      }
    }

    return key;
  }

  registerMethods() {
    const service = this;

    return {
      renderNode: {
        trans(key: string = '', args: {} = {}, catalog?: object) {
          const mergedCatalog = service.mergeCatalog(catalog, this.translations);
          const keyResolved = service.resolveAlias(
            key,
            this.translationDomains,
            this.view
          );

          return service.trans(keyResolved, args, mergedCatalog);
        },
      },
      vue: {
        methods: {
          trans(key: string = '', args: {} = {}, catalog?: object) {
            const mergedCatalog = service.mergeCatalog(catalog, this.translations);
            const keyResolved = service.resolveAlias(
              key,
              this.rootComponent.translationDomains,
              (this as any).viewPath
            );

            return service.trans(
              keyResolved,
              args,
              mergedCatalog
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
    return stringFormat((catalog as any)[string] || string, args);
  }
}
