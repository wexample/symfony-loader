import InvariantViolationError from './InvariantViolationError';

export default class MissingServiceError extends InvariantViolationError {
  constructor(serviceName: string) {
    super({
      message: `Service not found: ${serviceName}`,
      code: 'ERR_MISSING_SERVICE',
      context: {
        serviceName,
      },
    });
  }
}
