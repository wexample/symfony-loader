import AppService from '../Class/AppService';

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

  getClient() {
    if (!this.client) {
      throw new Error('API client is missing. Override App.createApiClient() to provide one.');
    }

    return this.client;
  }

  setClient(client: any): void {
    this.client = client;
  }
}
