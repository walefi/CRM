import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortalAccessLogService {
  private readonly logger = new Logger(PortalAccessLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: string;
    action: string;
    resource?: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: any;
    tenantId: string;
  }) {
    const prismaAny = this.prisma as any;
    return prismaAny.customerPortalAccessLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: params.metadata || undefined,
        tenantId: params.tenantId,
      },
    });
  }

  async getLogs(tenantId: string, userId: string, dto: { page?: number; limit?: number }) {
    const prismaAny = this.prisma as any;
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where = { userId, tenantId };
    const [data, total] = await Promise.all([
      prismaAny.customerPortalAccessLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.customerPortalAccessLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getStats(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, byAction] = await Promise.all([
      prismaAny.customerPortalAccessLog.count({ where: { userId, tenantId } }),
      prismaAny.customerPortalAccessLog.count({
        where: { userId, tenantId, createdAt: { gte: today } },
      }),
      prismaAny.customerPortalAccessLog.groupBy({
        by: ['action'],
        where: { userId, tenantId },
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      byAction: byAction.map((a: any) => ({ action: a.action, count: a._count })),
    };
  }
}
