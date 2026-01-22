import { createApp } from "vue";
import AppService from '../Class/AppService';
import MixinsAppService from '../Class/MixinsAppService';
import LayoutInterface from '../Interfaces/RenderData/LayoutInterface';
import { domAppendInnerHtml } from '@wexample/js-helpers/Helper/Dom';
import Component from '../Class/Component';
import App from '../Class/App';
import ComponentInterface from '../Interfaces/RenderData/ComponentInterface';
import { stringBuildIdentifier, stringToKebab } from '@wexample/js-helpers/Helper/String';
import { objectDeepAssign } from "@wexample/js-helpers/Helper/Object";

export default class VueService extends AppService {
  protected componentRegistered: { [key: string]: object } = {};
  protected elTemplates: HTMLElement;
  public vueRenderDataCache: { [key: string]: ComponentInterface } = {};
  public static serviceName: string = 'vue';
  public globalConfig: object = {}
  public store: any = null;

  protected globalMixin: object = {
    props: {},

    methods: {},

    async updated() {
      await this.rootComponent.forEachTreeRenderNode((renderNode) => {
        if (this === this.$root) {
          renderNode.updateMounting();
        }
      });
    },
  };

  public renderedTemplates: { [key: string]: boolean } = {};

  constructor(app: App, globalConfig: object = {}) {
    super(app);

    this.globalConfig = objectDeepAssign(
      {},
      {
        compilerOptions: {
          delimiters: ['[[', ']]'],
        },
      },
      globalConfig
    );
    this.globalConfig['globalProperties'] = this.globalConfig['globalProperties'] ? this.globalConfig['globalProperties']: {};
    this.globalConfig['globalProperties']['app'] = app;

    this.elTemplates = document.getElementById('vue-templates');
  }

  registerHooks(): { app?: {}; page?: {} } {
    return {
      app: {
        hookInit(registry) {
          // Wait for vue to be loaded.
          if (
            registry.assets === MixinsAppService.LOAD_STATUS_COMPLETE &&
            registry.pages === MixinsAppService.LOAD_STATUS_COMPLETE
          ) {
            this.app.services.mixins.applyMethods(this.globalMixin, 'vue');

            return;
          }
          return MixinsAppService.LOAD_STATUS_WAIT;
        },

        hookLoadLayoutRenderData(renderData: LayoutInterface) {
          this.app.services.vue.addTemplatesHtml(renderData.vueTemplates);
        },
      },
    };
  }

  registerMethods() {
    const app = this.app;

    return {
      vue: {
        props: {
          app: {
            default: () => {
              return app;
            },
          },
        },
      },
    };
  }

  createApp(rootComponent, props: any = {}) {
    const vueApp = createApp(
      rootComponent,
      props,
    );

    objectDeepAssign(
      vueApp.config,
      this.globalConfig);

    if (this.store) {
      vueApp.use(this.store);
    }

    if (rootComponent.vueAppInit) {
      rootComponent.vueAppInit(vueApp)
    }

    this.registerComponentsRecursively(vueApp, this.componentRegistered);

    return vueApp;
  }

  inherit(vueComponent, rootComponent: Component) {
    let componentsFinal = vueComponent.components || {};
    let extend = {components: {}};

    if (vueComponent.extends) {
      extend = this.inherit(vueComponent.extends, rootComponent);
    }

    let componentsStrings = {
      ...extend.components,
      ...componentsFinal,
    };

    // Convert initial strings to initialized component.
    Object.entries(componentsStrings).forEach((data) => {
      // Prevent to initialize already converted object.
      if (typeof data[1] === 'string') {
        vueComponent.components[data[0]] = this.initComponent(
          data[1],
          rootComponent
        );
      }
    });

    return vueComponent;
  }

  registerComponentsRecursively(vueApp, componentObj) {
    for (const [name, value] of Object.entries(componentObj)) {
      const kebabName = stringToKebab(name);
      if (!vueApp.component(kebabName)) {
        vueApp.component(kebabName, value);
      }

      if ((value as any).components) {
        this.registerComponentsRecursively(vueApp, (value as any).components);
      }
    }
  }

  createVueAppForComponent(component: Component) {
    return this.createApp(
      this.initComponent(
        component.renderData.options.name,
        component
      ),
      component.renderData.options.props);
  }

  initComponent(view: string, rootComponent: Component): object {
    const vueName = stringBuildIdentifier(view);

    if (!this.componentRegistered[vueName]) {
      const domId = 'vue-template-' + vueName;
      const vueClassDefinition = this.app.getBundleClassDefinition(view) as any;

      if (!vueClassDefinition) {
        this.app.services.prompt.systemError(
          'Missing vue definition for ":class"',
          {
            ':class': view,
          }
        );
      } else {
        vueClassDefinition.template = document.getElementById(domId);

        vueClassDefinition.props = {
          ...vueClassDefinition.props,
          ...{
            rootComponent: {
              type: Object,
              default: rootComponent,
            },
            translations: {
              type: Object,
              default: rootComponent.translations,
            },
            viewPath: {
              type: String,
              default: view,
            },
          },
        };

        vueClassDefinition.mixins = (vueClassDefinition.mixins || []).concat([
          this.globalMixin,
        ]);

        if (!vueClassDefinition.template) {
          this.app.services.prompt.systemError(
            `Unable to load vue component as template item #:id has not been found.`,
            {
              ':id': domId
            },
            undefined,
            true
          );
        }

        this.componentRegistered[vueName] = vueClassDefinition;

        this.inherit(vueClassDefinition, rootComponent);
      }
    }

    return this.componentRegistered[vueName];
  }

  addTemplatesHtml(renderedTemplates: string[]) {
    let elContainer = this.elTemplates;

    for (let name in renderedTemplates) {
      if (!this.renderedTemplates[name]) {
        domAppendInnerHtml(elContainer, renderedTemplates[name]);
        this.renderedTemplates[name] = true;
      }
    }
  }
}
