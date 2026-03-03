import AppService from '../Class/AppService';
import AdaptiveResponseInterface from '../Interfaces/AdaptiveResponseInterface';
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import RequestOptionsInterface from '../Interfaces/RequestOptions/RequestOptionsInterface';
import ComponentsService from './ComponentsService';
import PromptService from './PromptsService';

export default class AdaptiveService extends AppService {
  public static dependencies: typeof AppService[] = [ComponentsService, PromptService];
  public static serviceName: string = 'adaptive';

  fetch(
    path: string,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<any> {
    // We should not mix options this way, event this is ignored,
    // the requestOptions may have a kind of sub config like requestOptions.fetchConfiguration
    return fetch(path, {
      ...{
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
      ...requestOptions,
    });
  }

  async requestData(
    path: string,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<AdaptiveResponseInterface> {
    const response = await this.fetch(path, requestOptions);

    if (!response.ok) {
      this.app.services.prompt.error(`Error response : [${response.status}] ${response.statusText}`);
    }

    try {
      const data = await response.json();
      if (typeof data.ok !== 'boolean') {
        data.ok = true;
      }
      return data;
    } catch (error) {
      this.app.services.prompt.error('Failed to parse JSON response.');
      return { ok: false } as AdaptiveResponseInterface;
    }
  }

  get(
    path: string,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<any> {
    requestOptions.callerPage =
      requestOptions.callerPage || this.app.layout.pageFocused;

    Object.freeze(requestOptions);

    return this.requestData(path, requestOptions).then(
      async (renderData: AdaptiveResponseInterface) => {
        return this.handleRenderData(renderData as RenderDataInterface, requestOptions);
      }
    );
  }

  post(
    path: string,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<any> {
    requestOptions.method = requestOptions.method || 'POST';
    requestOptions.callerPage =
      requestOptions.callerPage || this.app.layout.pageFocused;

    Object.freeze(requestOptions);

    return this.requestData(path, requestOptions).then(
      async (renderData: AdaptiveResponseInterface) => {
        return this.handleRenderData(renderData as RenderDataInterface, requestOptions);
      }
    );
  }

  async handleRenderData(
    renderData: RenderDataInterface,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<RenderDataInterface> {
    if (renderData.ok === false) {
      return renderData;
    }

    renderData.requestOptions = requestOptions;

    // Preparing render data is executed in render node creation,
    // but at this point layout already exists,
    // so we run it manually.
    await this.app.services.layouts.prepareRenderData(renderData);

    // Wait render data loading to continue.
    return this.app.loadLayoutRenderData(renderData).then(async () => {
      // Activate every new render node.
      await this.app.layout.setNewTreeRenderNodeReady();

      return renderData;
    });
  }
}
