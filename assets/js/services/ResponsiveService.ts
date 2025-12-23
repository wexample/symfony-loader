import AssetsService from './AssetsService';
import AppService from '../class/AppService';
import EventsService from '../services/EventsService';
import Events from '../helpers/Events';
import RenderNode from '../class/RenderNode';
import AssetUsage from '../class/AssetUsage';
import Page from "../class/Page";
import { callPrototypeMethodIfExists } from "../helpers/Objects";
import PageResponsiveDisplay from "../class/PageResponsiveDisplay";

export class ResponsiveServiceEvents {
  public static RESPONSIVE_CHANGE_SIZE: string = 'responsive-change-size';
}

export type RenderNodeResponsiveType = {
  responsiveSizeCurrent?: string;
  responsiveSizePrevious?: string;
  responsiveDisplays: PageResponsiveDisplay[];
  responsiveSet: Function;
};

export default class ResponsiveService extends AppService {
  public static dependencies: typeof AppService[] = [AssetsService, EventsService];
  public static serviceName: string = 'responsive';

  registerHooks() {
    return {
      app: {
        async hookLoadLayoutRenderData() {
          window.addEventListener(
            Events.RESIZE,
            async () => await this.app.layout.responsiveUpdate(true)
          );
        },
      },

      renderNode: {
        async hookMounted(renderNode: RenderNode | any) {
          await renderNode.responsiveUpdate(
            // Do not propagate as children might not be created.
            false
          );
        },
      },
    };
  }

  registerMethods(object: any, group: string) {
    const methods = {
      renderNode: {
        responsiveSupportsBreakpoint(letter: string): boolean {
          return this.responsiveBreakpointSupported().hasOwnProperty(letter);
        },

        responsiveDetect() {
          const supported = this.responsiveBreakpointSupported();
          if (!Object.values(supported).length) {
            this.el.style.display = 'block';
            return;
          }

          return Object.entries(supported).reduce(
            (prev, current) => {
              // Return the greater one.
              return current[1] > prev[1] ? current : prev;
            }
          )[0];
        },

        responsiveBreakpointSupported(): object {
          const supported = {};
          const width = this.getElWidth();

          Object.entries(this.app.layout.vars.displayBreakpoints).forEach(
            (entry) => {
              if (width > entry[1]) {
                supported[entry[0]] = entry[1];
              }
            }
          );

          return supported;
        },

        async responsiveSet(size: string, propagate: boolean) {
          if (size !== this.responsiveSizeCurrent) {
            this.responsiveSizePrevious = this.responsiveSizeCurrent;
            this.responsiveSizeCurrent = size;

            await this.assetsUpdate(AssetUsage.USAGE_RESPONSIVE);

            // Now change page class.
            this.responsiveUpdateClass();

            this.app.services.events.trigger(
              ResponsiveServiceEvents.RESPONSIVE_CHANGE_SIZE,
              {
                renderNode: this,
                current: size,
                previous: this.responsiveSizePrevious,
              }
            );
          }

          if (propagate) {
            await this.forEachTreeChildRenderNode(
              async (renderNode: RenderNode | any) => {
                await renderNode.responsiveSet(size, propagate);
              }
            );
          }
        },

        responsiveUpdateClass() {
          // Remove all responsive class names.
          const classList = this.el.classList;

          classList.remove(`responsive-${this.responsiveSizePrevious}`);
          classList.add(`responsive-${this.responsiveSizeCurrent}`);
        },

        async responsiveUpdate(propagate: boolean) {
          await this.responsiveSet(this.responsiveDetect(), propagate);
        },
      },
    };

    if (object instanceof Page) {
      methods.renderNode = Object.assign(methods.renderNode, {
        responsiveDisplays: [],

        activateListeners(...args) {
          callPrototypeMethodIfExists(this, 'activateListeners', args);
          this.onChangeResponsiveSizeProxy = this.onChangeResponsiveSize.bind(this);

          this.app.services.events.listen(
            ResponsiveServiceEvents.RESPONSIVE_CHANGE_SIZE,
            this.onChangeResponsiveSizeProxy
          );
        },

        deactivateListeners(...args) {
          callPrototypeMethodIfExists(this, 'deactivateListeners', args);

          this.app.services.events.forget(
            ResponsiveServiceEvents.RESPONSIVE_CHANGE_SIZE,
            this.onChangeResponsiveSizeProxy
          );
        },

        async onChangeResponsiveSize(event) {
          if (event.detail.renderNode === this) {
            await this.updateCurrentResponsiveDisplay();
          }
        },

        async updateCurrentResponsiveDisplay(...args) {
          callPrototypeMethodIfExists(this, 'updateCurrentResponsiveDisplay', args);

          const previous = this.responsiveSizePrevious;
          const current = this.responsiveSizeCurrent;
          const displays = this.responsiveDisplays;

          if (previous !== current) {
            if (displays[current] === undefined) {
              const display = this.app.getBundleClassDefinition(
                `${this.view}-${current}`,
                true
              );

              displays[current] = display ? new display(this) : null;

              if (displays[current]) {
                displays[current].init();
              }
            }

            if (displays[previous]) {
              await displays[previous].onResponsiveExit();
            }

            if (displays[current]) {
              await displays[current].onResponsiveEnter();
            }

            this.responsiveDisplayCurrent = displays[current];
          }
        }
      })
    }

    return methods;
  }
}
