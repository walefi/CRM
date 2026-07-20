import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiExecutionLogService {
  private readonly logger = new Logger(AiExecutionLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    entityType?: string;
    entityId?: string;
    prompt?: string;
    response?: string;
    model?: string;
    provider?: string;
    tokens?: number;
    cost?: number;
    durationMs?: number;
    success?: boolean;
    error?: string;
    metadata?: any;
    tenantId: string;
    userId?: string;
  }) {
    const prismaAny = this.prisma as any;
    return prismaAny.aiExecutionLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        prompt: params.prompt?.substring(0, 5000),
        response: params.response?.substring(0, 5000),
        model: params.model,
        provider: params.provider,
        tokens: params.tokens || 0,
        cost: params.cost || 0,
        durationMs: params.durationMs || 0,
        success: params.success !== false,
        error: params.error,
        metadata: params.metadata || undefined,
        tenantId: params.tenantId,
        userId: params.userId,
      },
    });
  }

  async getLogs(
    tenantId: string,
    dto: { action?: string; entityType?: string; page?: number; limit?: number },
  ) {
    const prismaAny = this.prisma as any;
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.action) where.action = dto.action;
    if (dto.entityType) where.entityType = dto.entityType;

    const [data, total] = await Promise.all([
      prismaAny.aiExecutionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.aiExecutionLog.count({ where }),
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

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;

    const [usage] = await Promise.all([
      prismaAny.aiExecutionLog.aggregate({
        where: { tenantId },
        _sum: { tokens: true, cost: true, durationMs: true },
        _count: true,
        _avg: { durationMs: true },
      }),
    ]);

    const byAction = await prismaAny.aiExecutionLog.groupBy({
      by: ['action'],
      where: { tenantId },
      _count: true,
      _sum: { tokens: true, cost: true },
    });

    return {
      totalExecutions: usage._count,
      totalTokens: usage._sum?.tokens || 0,
      totalCost: usage._sum?.cost || 0,
      avgDurationMs: Math.round(usage._avg?.durationMs || 0),
      byAction: byAction.map((a: any) => ({
        action: a.action,
        count: a._count,
        tokens: a._sum?.tokens || 0,
        cost: a._sum?.cost || 0,
      })),
    };
  }
}
