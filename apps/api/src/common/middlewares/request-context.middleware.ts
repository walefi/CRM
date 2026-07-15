import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { runWithContext, RequestContext } from '../../infrastructure/observability/logging/app-logger.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuid();
    const correlationId = (req.headers['x-correlation-id'] as string) || requestId;

    const context: RequestContext = {
      requestId,
      correlationId,
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] as string,
    };

    (req as unknown as Record<string, unknown>).requestId = requestId;
    (req as unknown as Record<string, unknown>).correlationId = correlationId;
    (req as unknown as Record<string, unknown>).startTime = Date.now();

    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-Id', correlationId);

    runWithContext(context, () => {
      next();
    });
  }
}
