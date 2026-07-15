import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    tenantId: string,
    userId: string,
    entity: string,
    entityId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.timeline.create({
        data: {
          tenantId,
          userId,
          entity,
          entityId,
          action,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Timeline log failed: ${entity}/${entityId}/${action}`, error);
    }
  }

  async getHistory(tenantId: string, entity: string, entityId: string) {
    return this.prisma.timeline.findMany({
      where: { tenantId, entity, entityId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
