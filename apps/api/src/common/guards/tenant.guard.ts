import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      throw new UnauthorizedException('Tenant context not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, slug: true, plan: true, status: true, deletedAt: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (tenant.deletedAt) {
      throw new ForbiddenException('Tenant has been deactivated');
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException('Tenant is suspended');
    }

    if (tenant.status === 'TRIAL') {
      const daysSinceCreation = user.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      if (daysSinceCreation > 14) {
        throw new ForbiddenException('Trial period expired');
      }
    }

    request.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
    };

    return true;
  }
}
