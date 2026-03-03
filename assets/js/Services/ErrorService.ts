import AppService from '../Class/AppService';
import ToastService from './ToastService';

const HANDLED_BY_ERROR_SERVICE_FLAG = '__handledByErrorService';

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
  logPayload: Record<string, unknown>;
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
    this.markErrorAsHandled(error);

    const errorAsRecord = this.getErrorRecord(error);
    const severity = options.severity || this.getErrorSeverity(errorAsRecord) || 'error';
    const message = this.toMessage(error);
    const context = {
      ...(this.getErrorContext(errorAsRecord) || {}),
      ...(options.context || {}),
    };

    const payload: ErrorPayload = {
      message,
      error,
      severity,
      title: options.title,
      context,
      logPayload: this.toLogPayload(error, {
        message,
        severity,
        title: options.title,
        context,
      }),
    };

    this.log(payload);

    if (options.toast !== false) {
      this.showToast(payload);
    }

    this.emit(payload);
    this.app.onTriggerError(payload);

    return payload;
  }

  info(message: string, context: ErrorContext = {}): ErrorPayload {
    return this.capture(message, { severity: 'info', context });
  }

  warning(message: string, context: ErrorContext = {}): ErrorPayload {
    return this.capture(message, { severity: 'warning', context });
  }

  error(message: string, context: ErrorContext = {}): ErrorPayload {
    return this.capture(message, { severity: 'error', context });
  }

  private registerGlobalHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.windowErrorHandler) {
      this.windowErrorHandler = (event: ErrorEvent) => {
        if (this.isErrorAlreadyHandled(event.error)) {
          return;
        }
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
        if (this.isErrorAlreadyHandled(event.reason)) {
          return;
        }
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

  private getErrorRecord(error: unknown): Record<string, unknown> | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    return error as Record<string, unknown>;
  }

  private getErrorSeverity(error: Record<string, unknown> | null): ErrorSeverity | undefined {
    if (!error) {
      return undefined;
    }

    const severity = error.severity;
    if (severity === 'info' || severity === 'warning' || severity === 'error' || severity === 'fatal') {
      return severity;
    }

    return undefined;
  }

  private getErrorContext(error: Record<string, unknown> | null): ErrorContext | undefined {
    if (!error) {
      return undefined;
    }

    const context = error.context;
    if (!context || typeof context !== 'object') {
      return {
        ...(typeof error.kind === 'string' ? { kind: error.kind } : {}),
        ...(typeof error.code === 'string' ? { code: error.code } : {}),
      };
    }

    return {
      ...(context as Record<string, unknown>),
      ...(typeof error.kind === 'string' ? { kind: error.kind } : {}),
      ...(typeof error.code === 'string' ? { code: error.code } : {}),
    };
  }

  private toLogPayload(
    error: unknown,
    normalized: {
      message: string;
      severity: ErrorSeverity;
      title?: string;
      context: ErrorContext;
    }
  ): Record<string, unknown> {
    const errorWithLogPayload = (
      error &&
      typeof error === 'object' &&
      typeof (error as { toLogPayload?: unknown }).toLogPayload === 'function'
    )
      ? error as { toLogPayload: () => unknown }
      : null;

    if (errorWithLogPayload) {
      const customPayload = errorWithLogPayload.toLogPayload();
      if (customPayload && typeof customPayload === 'object') {
        return customPayload as Record<string, unknown>;
      }
    }

    const errorAsRecord = this.getErrorRecord(error);

    return {
      message: normalized.message,
      severity: normalized.severity,
      title: normalized.title,
      context: normalized.context,
      ...(error instanceof Error ? {
        name: error.name,
        stack: error.stack,
      } : {}),
      ...(errorAsRecord ? errorAsRecord : {}),
    };
  }

  private isErrorAlreadyHandled(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return !!(error as Record<string, unknown>)[HANDLED_BY_ERROR_SERVICE_FLAG];
  }

  private markErrorAsHandled(error: unknown): void {
    if (!error || typeof error !== 'object') {
      return;
    }

    (error as Record<string, unknown>)[HANDLED_BY_ERROR_SERVICE_FLAG] = true;
  }
}
