import AppService from '../Class/AppService';
import { stringBuildIdentifier, stringFormat } from '@wexample/js-helpers/Helper/String';

export type RenderNodeLocaleType = {
  trans(key?: string, args?: object, catalog?: object): string;
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

  // Only the vue the loader mounts carries its view as a prop; one imported by
  // another vue does not. Every vue names its template after its view though,
  // and the root holds the view of each vue it rendered: the one whose
  // template id matches is the view.
  private resolveVueView(
    component: any,
    domainsMap: any
  ): string | undefined {
    if (component.$props?.viewPath) {
      return component.$props.viewPath;
    }

    const template = component.$options?.template;

    if (typeof template !== 'string') {
      return undefined;
    }

    for (const entry of Object.values(domainsMap || {})) {
      if (entry && typeof entry === 'object') {
        const view = Object.keys(entry).find(
          (view) => `#vue-template-${stringBuildIdentifier(view)}` === template
        );

        if (view) {
          return view;
        }
      }
    }

    return undefined;
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
            const component = this as any;
            const rootComponent = component.$root.rootComponent;

            // The alias resolves against the view of the vue holding the key,
            // here, before the root is handed anything. The root is the core
            // vue component, whose own view matches no entry of the map: left
            // to it, every vue of the page would read the domain of whichever
            // one was rendered first.
            return rootComponent.trans(
              service.resolveAlias(
                key,
                rootComponent.translationDomains,
                service.resolveVueView(component, rootComponent.translationDomains)
              ),
              args,
              catalog
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
