import AbstractApiClient, { type ApiClientOptions } from '@wexample/js-api/Common/AbstractApiClient';

export default class AdaptiveClient extends AbstractApiClient {
  constructor(options: ApiClientOptions = {}) {
    super({
      ...options,
      defaultHeaders: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.defaultHeaders ?? {}),
      },
    });
  }
}
