export abstract class AppException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundException extends AppException {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class BadRequestException extends AppException {
  readonly code = 'BAD_REQUEST';
  readonly statusCode = 400;
}

export class UnauthorizedException extends AppException {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;
}

export class ForbiddenException extends AppException {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
}

export class ConflictException extends AppException {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
}

export class InternalException extends AppException {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;
}

export class ValidationException extends AppException {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 422;
}

export class RateLimitException extends AppException {
  readonly code = 'RATE_LIMIT';
  readonly statusCode = 429;
}

export class ServiceUnavailableException extends AppException {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
}
