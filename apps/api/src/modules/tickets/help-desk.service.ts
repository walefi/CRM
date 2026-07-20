import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HelpDeskService {
  private readonly logger = new Logger(HelpDeskService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Tickets
  async getTickets(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.priority) where.priority = dto.priority;
    if (dto.queue) where.queue = dto.queue;
    if (dto.assignedToId) where.assignedToId = dto.assignedToId;
    if (dto.search) where.subject = { contains: dto.search, mode: 'insensitive' };
    if (dto.type) where.type = dto.type;

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { comments: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      prismaAny.ticket.count({ where }),
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

  async getTicket(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const ticket = await prismaAny.ticket.findFirst({
      where: { id, tenantId },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
        attachments: true,
      },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async createTicket(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const slaDeadline = this.calculateSLADeadline(dto.priority || 'normal');
    const ticket = await prismaAny.ticket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        status: 'new',
        priority: dto.priority || 'normal',
        type: dto.type || 'support',
        category: dto.category,
        queue: dto.queue || 'support_n1',
        channel: dto.channel,
        tags: dto.tags || [],
        contactId: dto.contactId,
        companyId: dto.companyId,
        dealId: dto.dealId,
        conversationId: dto.conversationId,
        slaDeadline,
        tenantId,
        createdBy: userId,
      },
    });
    await prismaAny.ticketHistory.create({
      data: { ticketId: ticket.id, action: 'created', userId, field: 'status', newValue: 'new' },
    });
    return ticket;
  }

  async updateTicket(tenantId: string, id: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const existing = await this.getTicket(tenantId, id);
    const data: any = {};
    const historyEntries: any[] = [];

    for (const [field, value] of Object.entries(dto)) {
      if (field === 'comments' || field === 'history' || field === 'attachments') continue;
      if (existing[field] !== value) {
        historyEntries.push({
          ticketId: id,
          action: 'updated',
          userId,
          field,
          oldValue: String(existing[field] || ''),
          newValue: String(value),
        });
      }
      data[field] = value;
    }

    if (dto.status === 'closed') data.closedAt = new Date();
    if (dto.status === 'resolved') data.resolvedAt = new Date();
    if (data.status === 'closed' || data.status === 'resolved') data.slaStatus = 'met';

    const ticket = await prismaAny.ticket.update({
      where: { id },
      data,
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (historyEntries.length > 0)
      await prismaAny.ticketHistory.createMany({ data: historyEntries });
    return ticket;
  }

  async deleteTicket(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.ticketAttachment.deleteMany({ where: { ticketId: id } });
    await prismaAny.ticketComment.deleteMany({ where: { ticketId: id } });
    await prismaAny.ticketHistory.deleteMany({ where: { ticketId: id } });
    await prismaAny.ticket.deleteMany({ where: { id, tenantId } });
  }

  async addComment(tenantId: string, id: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const ticket = await prismaAny.ticket.findFirst({ where: { id, tenantId } });
    if (!ticket) throw new Error('Ticket not found');
    const comment = await prismaAny.ticketComment.create({
      data: { ticketId: id, content: dto.content, isInternal: dto.isInternal || false, userId },
    });
    await prismaAny.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
    return comment;
  }

  async assignTicket(tenantId: string, id: string, userId: string) {
    const prismaAny = this.prisma as any;
    const ticket = await prismaAny.ticket.findFirst({ where: { id, tenantId } });
    if (!ticket) throw new Error('Ticket not found');
    await prismaAny.ticketHistory.create({
      data: { ticketId: id, action: 'assigned', userId, field: 'assignedToId', newValue: userId },
    });
    return prismaAny.ticket.update({
      where: { id },
      data: { assignedToId: userId, status: 'open', updatedAt: new Date() },
    });
  }

  async closeTicket(tenantId: string, id: string, userId: string) {
    const prismaAny = this.prisma as any;
    const ticket = await prismaAny.ticket.findFirst({ where: { id, tenantId } });
    if (!ticket) throw new Error('Ticket not found');
    await prismaAny.ticketHistory.create({ data: { ticketId: id, action: 'closed', userId } });
    return prismaAny.ticket.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date(), updatedAt: new Date() },
    });
  }

  async reopenTicket(tenantId: string, id: string, userId: string) {
    const prismaAny = this.prisma as any;
    const ticket = await prismaAny.ticket.findFirst({ where: { id, tenantId } });
    if (!ticket) throw new Error('Ticket not found');
    await prismaAny.ticketHistory.create({ data: { ticketId: id, action: 'reopened', userId } });
    return prismaAny.ticket.update({
      where: { id },
      data: {
        status: 'open',
        reopenedCount: (ticket?.reopenedCount || 0) + 1,
        closedAt: null,
        updatedAt: new Date(),
      },
    });
  }

  // Knowledge Base
  async getArticles(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId, status: 'published' };
    if (dto.category) where.category = dto.category;
    if (dto.search) where.title = { contains: dto.search, mode: 'insensitive' };
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.knowledgeArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prismaAny.knowledgeArticle.count({ where }),
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

  async getArticle(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return prismaAny.knowledgeArticle.findFirst({ where: { id, tenantId } });
  }

  async createArticle(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).knowledgeArticle.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        tags: dto.tags || [],
        status: dto.status || 'published',
        isInternal: dto.isInternal || false,
        tenantId,
        createdBy: userId,
      },
    });
  }

  async updateArticle(tenantId: string, id: string, dto: any) {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.knowledgeArticle.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Article not found');
    const data: any = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) data[k] = v;
    }
    return prismaAny.knowledgeArticle.update({ where: { id }, data });
  }

  async deleteArticle(tenantId: string, id: string) {
    await (this.prisma as any).knowledgeArticle.deleteMany({ where: { id, tenantId } });
  }

  // Stats
  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [open, resolved, slaBreached, backlog, articles] = await Promise.all([
      prismaAny.ticket.count({
        where: { tenantId, status: { in: ['new', 'open', 'in_progress'] } },
      }),
      prismaAny.ticket.count({
        where: { tenantId, status: 'closed', closedAt: { gte: todayStart } },
      }),
      prismaAny.ticket.count({
        where: { tenantId, slaStatus: 'breached', status: { notIn: ['closed', 'resolved'] } },
      }),
      prismaAny.ticket.count({
        where: { tenantId, status: { in: ['new', 'open'] }, assignedToId: null },
      }),
      prismaAny.knowledgeArticle.count({ where: { tenantId, status: 'published' } }),
    ]);

    return {
      openTickets: open,
      resolvedToday: resolved,
      slaBreached,
      backlog,
      articles,
    };
  }

  private calculateSLADeadline(priority: string): Date {
    const hours = { low: 72, normal: 24, high: 8, urgent: 4, critical: 1 }[priority] || 24;
    return new Date(Date.now() + hours * 3600000);
  }
}
