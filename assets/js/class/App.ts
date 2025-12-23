import Page from './Page';

import AppService from './AppService';
import AssetsService from '../services/AssetsService';
import LayoutsService from '../services/LayoutsService';
import MixinsService from '../services/MixinsService';
import PagesService from '../services/PagesService';
import { RenderNodeResponsiveType } from '../services/ResponsiveService';
import RoutingService from '../services/RoutingService';
import { unique as arrayUnique } from '../helpers/ArrayHelper';
import RenderDataInterface from '../interfaces/RenderData/RenderDataInterface';
import LayoutInitial from './LayoutInitial';
import LayoutInterface from '../interfaces/RenderData/LayoutInterface';
import AsyncConstructor from './AsyncConstructor';
import ServicesRegistryInterface from '../interfaces/ServicesRegistryInterface';
import AssetsCollectionInterface from "../interfaces/AssetsCollectionInterface";

interface AppRegistryInterface {
  bundles: {
    classes: {}
  };
  layoutRenderData: LayoutInterface;
  assetsRegistry: AssetsCollectionInterface;
}

export default class extends AsyncConstructor {
  public hasCoreLoaded: boolean = false;
  public layout: LayoutInitial & RenderNodeResponsiveType = null;
  public lib: object = {};
  public services: ServicesRegistryInterface = {};
  public registry = {} as AppRegistryInterface;

  constructor(
    readyCallback?: any | Function,
    globalName: string = 'app'
  ) {
    super();

    window[globalName] = this;

    // Allow callback as object definition.
    if (typeof readyCallback === 'object') {
      Object.assign(this, readyCallback);
      // Allow object.readyCallback property.
      readyCallback = readyCallback.readyCallback || readyCallback;
    }

    let doc = window.document;

    let run = async () => {
      await this.loadAndInitServices(this.getServices());

      const registry = this.registry = window['appRegistry'] as AppRegistryInterface;
      // Save layout class definition to allow loading it as a normal render node definition.
      registry.bundles.classes[registry.layoutRenderData.view] = LayoutInitial;

      this.layout = (await this.services.layouts.createRenderNode(
        registry.layoutRenderData.renderRequestId,
        registry.layoutRenderData.view,
        registry.layoutRenderData
      )) as (LayoutInitial & RenderNodeResponsiveType);

      // The main functionalities are ready,
      // but first data has not been loaded.
      this.hasCoreLoaded = true;

      // Every core properties has been set,
      // block any try to add extra property.
      this.seal();

      await this.loadLayoutRenderData(this.layout.renderData);

      // Display page content.
      this.layout.el.classList.remove('layout-loading');

      // Execute ready callbacks.
      await this.readyComplete();

      // Activate every new render node.
      await this.layout.setNewTreeRenderNodeReady();

      readyCallback && (await readyCallback());
    };

    let readyState = doc.readyState;

    // Document has been parsed.
    // Allows running after loaded event.
    if (['complete', 'loaded', 'interactive'].indexOf(readyState) !== -1) {
      this.async(run);
    } else {
      doc.addEventListener('DOMContentLoaded', run);
    }
  }

  async loadLayoutRenderData(renderData: RenderDataInterface): Promise<any> {
    // These elements can't be mounted during regular mount pass.
    this.layout.attachCoreHtmlElements();

    await this.services.mixins.invokeUntilComplete(
      'hookLoadLayoutRenderData',
      'app',
      [renderData]
    );

    // Pass through the whole tree to find unmounted nodes.
    await this.layout.mountTree();
  }

  getClassPage() {
    return Page;
  }

  getServices(): (typeof AppService | [typeof AppService, any[]])[] {
    return [
      AssetsService,
      LayoutsService,
      MixinsService,
      PagesService,
      RoutingService,
    ];
  }

  loadServices(services: (typeof AppService | [typeof AppService, any[]])[]): AppService[] {
    services = this.getServicesAndDependencies(services);
    let instances = [];

    services.forEach((service: (typeof AppService | [typeof AppService, any[]])) => {
      let serviceClass
      let serviceArgs: any[] = [];

      if (Array.isArray(service)) {
        serviceClass = service[0];
        serviceArgs = service[1];
      } else {
        serviceClass = service;
      }

      let name = serviceClass.serviceName;
      if (!this.services[name]) {
        this.services[name] = new serviceClass(this, ...serviceArgs);
        instances.push(this.services[name]);
      }
    });

    return instances;
  }

  async loadAndInitServices(
    services: (typeof AppService | [typeof AppService, any[]])[]
  ): Promise<any> {
    let loadedServices = this.loadServices(services);

    // Init mixins.
    return this.services.mixins.invokeUntilComplete(
      'hookInit',
      'app',
      [],
      undefined,
      loadedServices
    );
  }

  getServicesAndDependencies(
    services: (typeof AppService | [typeof AppService, any[]])[]
  ): (typeof AppService | [typeof AppService, any[]])[] {

    services.forEach((serviceDef: typeof AppService | [typeof AppService, any[]]) => {
      let serviceClass: typeof AppService;

      if (Array.isArray(serviceDef)) {
        serviceClass = serviceDef[0];
      } else {
        serviceClass = serviceDef;
      }

      if (serviceClass.dependencies) {
        services = [
          ...services,
          ...this.getServicesAndDependencies(serviceClass.dependencies),
        ];
      }
    });

    return arrayUnique(services) as (typeof AppService | [typeof AppService, any[]])[];
  }

  /**
   * @param classRegistryName
   * @param bundled
   */
  getBundleClassDefinition(
    classRegistryName: string,
    bundled: boolean = false
  ): object | null {
    let bundle = this.registry.bundles.classes[classRegistryName];

    if (bundled) {
      return bundle ? bundle : null;
    }

    return bundle;
  }

  getService(name: string | object): AppService {
    name = (typeof name === 'string' ? name : (name as any).serviceName) as string

    if (!this.services[name]) {
      this.services.prompt.systemError(
        'Trying to access undefined service :name',
        {
          'name': name
        }, undefined, true
      );
    }
    return this.services[name];
  }

  addLib(name: string, object: any) {
    this.lib[name] = object;
  }

  addLibraries(libraries) {
    // Initialize preexisting libs.
    Object.entries(libraries).forEach((data) => {
      this.addLib(data[0], data[1]);
    });
  }
}
