import AppService from '../Class/AppService';
import AbstractApiEntitiesClient from "@wexample/js-api/Common/AbstractApiEntitiesClient";
import InvariantViolationError from '../Errors/InvariantViolationError';

export default class ApiService extends AppService {
  public static serviceName: string = 'api';
  private client: any = null;

  registerHooks() {
    return {
      app: {
        async hookLoadLayoutRenderData() {
          if (!this.client) {
            this.client = this.app.createApiClient?.() ?? null;
          }
        },
      },
    };
  }

  registerMethods() {
    const service = this;

    return {
      renderNode: {
        getApiClient: () => {
          return (this.app.getService(ApiService) as ApiService).getClient() as AbstractApiEntitiesClient;
        }
      }
    }
  }

  getClient() {
    if (!this.client) {
      throw new InvariantViolationError({
        message: 'API client is missing. Override App.createApiClient() to provide one.',
        code: 'ERR_API_CLIENT_MISSING',
      });
    }

    return this.client;
  }

  setClient(client: any): void {
    this.client = client;
  }
}
