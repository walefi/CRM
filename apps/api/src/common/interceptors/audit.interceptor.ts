import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;

    const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!auditableMethods.includes(method) || !user) {
      return next.handle();
    }

    const entity = url.split('/')[2] || 'unknown';

    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              action: method,
              entity,
              entityId: data?.id || undefined,
              userId: user.id,
              tenantId: user.tenantId,
              ip: request.ip,
              userAgent: request.headers['user-agent'] || null,
              metadata: {
                url,
                statusCode: context.switchToHttp().getResponse().statusCode,
              },
            },
          });
        } catch {}
      }),
    );
  }
}
