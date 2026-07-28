import AdaptiveClient from '../Class/AdaptiveClient';
import AppService from '../Class/AppService';
import AdaptiveResponseInterface from '../Interfaces/AdaptiveResponseInterface';
import RenderDataInterface from '../Interfaces/RenderData/RenderDataInterface';
import RequestOptionsInterface from '../Interfaces/RequestOptions/RequestOptionsInterface';
import ComponentsService from './ComponentsService';
import ErrorService from './ErrorService';

export default class AdaptiveService extends AppService {
  public static dependencies: typeof AppService[] = [ComponentsService, ErrorService];
  public static serviceName: string = 'adaptive';

  private adaptiveClient: AdaptiveClient | null = null;

  private getClient(): AdaptiveClient {
    if (!this.adaptiveClient) {
      this.adaptiveClient = new AdaptiveClient({
        onError: (error) => {
          this.app.services.error?.capture(error, {
            severity: 'error',
            context: { source: 'adaptive.request' },
          });
        },
      });
    }
    return this.adaptiveClient;
  }

  async requestData(
    path: string,
    requestOptions: RequestOptionsInterface = {}
  ): Promise<AdaptiveResponseInterface> {
    try {
      const method = (requestOptions.method ?? 'GET').toUpperCase();
      const client = this.getClient();
      const kyOptions = requestOptions.headers ? { headers: requestOptions.headers } : undefined;

      const response = method === 'POST'
        ? await client.post({ path, options: kyOptions })
        : await client.get({ path, options: kyOptions });

      const data = await response.json() as AdaptiveResponseInterface;
      if (typeof data.ok !== 'boolean') {
        data.ok = true;
      }
      return data;
    } catch (error) {
      this.app.services.error?.capture(error, {
        title: 'Failed to parse JSON response.',
        severity: 'error',
        context: { source: 'adaptive.request', details: { path } },
      });
      return { ok: false, responseType: 'error' } as AdaptiveResponseInterface;
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
