import AbstractAppError from './AbstractAppError';

export type InvariantViolationErrorOptions = {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  cause?: unknown;
};

export default class InvariantViolationError extends AbstractAppError {
  constructor(options: InvariantViolationErrorOptions) {
    super({
      message: options.message,
      kind: 'invariant.violation',
      code: options.code,
      severity: 'fatal',
      context: options.context,
      cause: options.cause,
    });
  }
}
