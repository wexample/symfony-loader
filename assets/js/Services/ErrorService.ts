import AppService from '../Class/AppService';
import ToastService from './ToastService';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export type ErrorContext = {
  source?: string;
  code?: string;
  kind?: string;
  details?: Record<string, unknown>;
};

export type CaptureErrorOptions = {
  title?: string;
  severity?: ErrorSeverity;
  toast?: boolean;
  context?: ErrorContext;
};

export type ErrorPayload = {
  message: string;
  error: unknown;
  severity: ErrorSeverity;
  title?: string;
  context: ErrorContext;
};

export class ErrorServiceEvents {
  public static CAPTURED: string = 'error-service:captured';
}

export default class ErrorService extends AppService {
  public static serviceName: string = 'error';

  private windowErrorHandler: ((event: ErrorEvent) => void) | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.registerGlobalHandlers();
        },
      },
    };
  }

  capture(error: unknown, options: CaptureErrorOptions = {}): ErrorPayload {
    const payload: ErrorPayload = {
      message: this.toMessage(error),
      error,
      severity: options.severity || 'error',
      title: options.title,
      context: {
        ...(options.context || {}),
      },
    };

    this.log(payload);

    if (options.toast !== false) {
      this.showToast(payload);
    }

    this.emit(payload);

    return payload;
  }

  private registerGlobalHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.windowErrorHandler) {
      this.windowErrorHandler = (event: ErrorEvent) => {
        this.capture(event.error || event.message, {
          title: 'Unhandled error',
          severity: 'error',
          context: {
            source: 'window.error',
            details: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          },
        });
      };
      window.addEventListener('error', this.windowErrorHandler);
    }

    if (!this.unhandledRejectionHandler) {
      this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        this.capture(event.reason, {
          title: 'Unhandled rejection',
          severity: 'error',
          context: {
            source: 'window.unhandledrejection',
          },
        });
      };
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  private showToast(payload: ErrorPayload): void {
    const toastService = this.app.services[ToastService.serviceName] as ToastService | undefined;
    if (!toastService) {
      return;
    }

    const type = payload.severity === 'info'
      ? 'info'
      : payload.severity === 'warning'
        ? 'warning'
        : 'error';

    void (toastService as any).show({
      type,
      title: payload.title || 'Error',
      message: payload.message,
      timeout: payload.severity === 'fatal' ? 8000 : 5000,
    });
  }

  private log(payload: ErrorPayload): void {
    const logger = payload.severity === 'info' ? console.info : console.error;
    logger('[ErrorService]', {
      message: payload.message,
      severity: payload.severity,
      context: payload.context,
      error: payload.error,
    });
  }

  private emit(payload: ErrorPayload): void {
    this.app.services.events?.trigger(ErrorServiceEvents.CAPTURED, payload);
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message || error.name;
    }

    if (typeof error === 'string' && error.trim() !== '') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
}
