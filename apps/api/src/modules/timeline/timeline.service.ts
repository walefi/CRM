import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(tenantId: string, dto: any) {
    return (this.prisma as any).timeline.create({
      data: {
        module: dto.module || 'system',
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        eventType: dto.eventType || 'generic',
        correlationId: dto.correlationId,
        summary: dto.summary,
        payload: (dto.payload as any) || {},
        metadata: (dto.metadata as any) || {},
        ip: dto.ip,
        device: dto.device,
        tenantId,
        userId: dto.userId,
      },
    });
  }

  async getTimeline(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.entity) {
      where.entity = dto.entity;
      where.entityId = dto.entityId;
    }
    if (dto.module) where.module = dto.module;
    if (dto.eventType) where.eventType = dto.eventType;
    if (dto.userId) where.userId = dto.userId;
    if (dto.search) where.summary = { contains: dto.search, mode: 'insensitive' };

    const page = dto.page || 1;
    const limit = dto.limit || 30;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.timeline.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          comments: { take: 1, orderBy: { createdAt: 'desc' } },
          reactions: true,
          attachments: true,
        },
      }),
      prismaAny.timeline.count({ where }),
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

  async getByEntity(tenantId: string, entity: string, entityId: string, page = 1, limit = 30) {
    return this.getTimeline(tenantId, { entity, entityId, page, limit });
  }

  async getByModule(tenantId: string, module: string, page = 1, limit = 30) {
    return this.getTimeline(tenantId, { module, page, limit });
  }

  async searchTimeline(tenantId: string, query: string, page = 1, limit = 30) {
    return this.getTimeline(tenantId, { search: query, page, limit });
  }

  async getComments(tenantId: string, timelineId: string) {
    return (this.prisma as any).timelineComment.findMany({
      where: { timelineId },
      include: { replies: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).timelineComment.create({
      data: { timelineId: dto.timelineId, content: dto.content, userId, replyToId: dto.replyToId },
    });
  }

  async updateComment(tenantId: string, id: string, content: string) {
    return (this.prisma as any).timelineComment.update({ where: { id }, data: { content } });
  }

  async deleteComment(tenantId: string, id: string) {
    await (this.prisma as any).timelineComment.deleteMany({ where: { id } });
  }

  async addReaction(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.timelineReaction.findUnique({
      where: {
        timelineId_userId_reaction: { timelineId: dto.timelineId, userId, reaction: dto.reaction },
      },
    });
    if (existing) {
      await prismaAny.timelineReaction.delete({ where: { id: existing.id } });
      return { removed: true };
    }
    return prismaAny.timelineReaction.create({
      data: { timelineId: dto.timelineId, userId, reaction: dto.reaction },
    });
  }

  async addBookmark(tenantId: string, userId: string, timelineId: string) {
    return (this.prisma as any).timelineBookmark.create({
      data: { timelineId, userId, tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, today, modules, eventTypes] = await Promise.all([
      prismaAny.timeline.count({ where: { tenantId } }),
      prismaAny.timeline.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prismaAny.timeline.groupBy({ by: ['module'], where: { tenantId }, _count: true }),
      prismaAny.timeline.groupBy({
        by: ['eventType'],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      }),
    ]);

    return { totalEvents: total, eventsToday: today, modules, topEventTypes: eventTypes };
  }
}
