import AdaptiveService from './AdaptiveService';
import LocaleService from './LocaleService';
import MixinsAppService from '../class/MixinsAppService';
import LayoutInterface from '../interfaces/RenderData/LayoutInterface';
import AbstractRenderNodeService from './AbstractRenderNodeService';
import Page from '../class/Page';
import RenderNode from '../class/RenderNode';
import AppService from '../class/AppService';
import ResponsiveService from "./ResponsiveService";
import PageManagerComponent from "../class/PageManagerComponent";

export default class PagesService extends AbstractRenderNodeService {
  public static dependencies: typeof AppService[] = [
    AdaptiveService,
    ResponsiveService,
    LocaleService,
  ];

  public pageHandlerRegistry: { [key: string]: PageManagerComponent } = {};

  public static serviceName: string = 'pages';

  registerHooks() {
    return {
      app: {
        async hookLoadLayoutRenderData(
          renderData: LayoutInterface,
          registry: any
        ) {
          if (
            registry.components === MixinsAppService.LOAD_STATUS_COMPLETE &&
            registry.responsive === MixinsAppService.LOAD_STATUS_COMPLETE &&
            registry.locale === MixinsAppService.LOAD_STATUS_COMPLETE
          ) {
            if (renderData.page) {
              await this.app.services.pages.createPageFromLayoutRenderData(renderData);
            }
            return;
          }

          return MixinsAppService.LOAD_STATUS_WAIT;
        },
      },
    };
  }

  async createPageFromLayoutRenderData(renderData: LayoutInterface) {
    let parentNode: PageManagerComponent | null = null;

    // If requestOptions.callerPage is defined, use it as parentNode
    if (renderData.requestOptions?.destPage) {
      parentNode = renderData.requestOptions.destPage as unknown as PageManagerComponent;
    }
    // Otherwise, set parent node based on page type
    else if (renderData.page && renderData.page.isInitialPage) {
      // Cast to unknown first to avoid type errors
      parentNode = this.app.layout as unknown as PageManagerComponent;
    } else if (renderData.renderRequestId) {
      // S'assurer que l'objet n'est pas undefined
      const registry = this.app.services?.pages?.pageHandlerRegistry || {};
      // Utiliser l'opérateur d'accès sécurisé pour éviter les erreurs TypeScript
      parentNode = registry?.[renderData.renderRequestId];

      if (parentNode) {
        // Clean up registry after handling
        delete registry[renderData.renderRequestId];
      }
      // If no page handler found, parentNode remains null
      // This will be handled by createRenderNode
    }

    if (parentNode && renderData.body) {
      parentNode.setLayoutBody(renderData.body);
    }

    return await this.createRenderNode(
      renderData.renderRequestId,
      renderData.page.view,
      renderData.page,
      parentNode
    );
  }

  createRenderNodeInstance(
    renderRequestId: string,
    classDefinition: any,
    parentRenderNode: RenderNode
  ): RenderNode | null {
    return super.createRenderNodeInstance(
      renderRequestId,
      classDefinition || this.app.getClassPage(),
      parentRenderNode
    ) as Page;
  }
}
