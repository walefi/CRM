import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getRequestContext } from '../../infrastructure/observability/logging/app-logger.service';

interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const reqCtx = getRequestContext();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data: this.sanitizeNull(data),
        metadata: {
          responseTime: `${Date.now() - request.startTime}ms`,
          statusCode: response.statusCode,
        },
        timestamp: new Date().toISOString(),
        requestId: reqCtx?.requestId || 'unknown',
      })),
    );
  }

  private sanitizeNull(data: T): T {
    if (data === null || data === undefined) {
      return undefined as unknown as T;
    }
    return data;
  }
}
