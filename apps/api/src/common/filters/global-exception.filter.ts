import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppException } from '../../shared/exceptions/app.exception';
import { getRequestContext } from '../../infrastructure/observability/logging/app-logger.service';

interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const reqCtx = getRequestContext();

    const errorResponse = this.buildErrorResponse(exception, request, reqCtx?.requestId || '');

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${errorResponse.statusCode} - ${errorResponse.message}`,
        process.env.NODE_ENV !== 'production' && exception instanceof Error ? exception.stack : undefined,
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} ${errorResponse.statusCode} - ${errorResponse.message}`,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
  ): ErrorResponse {
    const base = {
      success: false as const,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: requestId || 'unknown',
    };

    if (exception instanceof AppException) {
      return {
        ...base,
        message: exception.message,
        code: exception.code,
        statusCode: exception.statusCode,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      let details: unknown;
      if (
        typeof exceptionResponse === 'object' &&
        !Array.isArray((exceptionResponse as any).message)
      ) {
        details = exceptionResponse;
      }

      return {
        ...base,
        message: Array.isArray(message) ? message[0] : message,
        code: this.mapHttpCode(status),
        statusCode: status,
        details: Array.isArray(message) ? message : details,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, base);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        ...base,
        message: 'Invalid data provided',
        code: 'VALIDATION_ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    if (exception instanceof Error) {
      return {
        ...base,
        message:
          process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message,
        code: 'INTERNAL_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    return {
      ...base,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    base: Omit<ErrorResponse, 'message' | 'code' | 'statusCode'>,
  ): ErrorResponse {
    switch (exception.code) {
      case 'P2002':
        return {
          ...base,
          message: 'Resource already exists',
          code: 'CONFLICT',
          statusCode: HttpStatus.CONFLICT,
        };
      case 'P2025':
        return {
          ...base,
          message: 'Resource not found',
          code: 'NOT_FOUND',
          statusCode: HttpStatus.NOT_FOUND,
        };
      case 'P2003':
        return {
          ...base,
          message: 'Related resource not found',
          code: 'FOREIGN_KEY_ERROR',
          statusCode: HttpStatus.BAD_REQUEST,
        };
      default:
        return {
          ...base,
          message: 'Database error',
          code: 'DATABASE_ERROR',
          statusCode: HttpStatus.BAD_REQUEST,
        };
    }
  }

  private mapHttpCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }
}
