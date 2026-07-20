import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { MessageCreatedEvent, MessageSentEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getConversations(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.channel) where.channel = dto.channel;
    if (dto.assignedToId) where.assignedToId = dto.assignedToId;
    if (dto.queueId) where.queueId = dto.queueId;
    if (dto.search) {
      where.OR = [
        { subject: { contains: dto.search, mode: 'insensitive' } },
        { lastMessagePreview: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, content: true, direction: true, createdAt: true },
          },
        },
      }),
      prismaAny.conversation.count({ where }),
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

  async getConversation(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const conv = await prismaAny.conversation.findFirst({
      where: { id, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 100 },
        notes: { orderBy: { createdAt: 'desc' }, take: 20 },
        assignments: true,
        participants: true,
      },
    });
    if (!conv) throw new NotFoundException(`Conversation ${id} not found`);
    return conv;
  }

  async getMessages(tenantId: string, conversationId: string, page = 1, limit = 50) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const where = { tenantId, conversationId };

    const [data, total] = await Promise.all([
      prismaAny.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { attachments: true, reactions: true },
      }),
      prismaAny.message.count({ where }),
    ]);
    return {
      data: data.reverse(),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const message = await prismaAny.message.create({
      data: {
        conversationId: dto.conversationId,
        content: dto.content,
        direction: 'OUTBOUND',
        channel: dto.channel || 'CHAT',
        messageType: dto.messageType || 'text',
        senderId: userId,
        status: 'sent',
        tenantId,
      },
    });

    await prismaAny.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: dto.content?.substring(0, 100),
        updatedAt: new Date(),
      },
    });

    try {
      const messageEvent = new MessageCreatedEvent(
        { ...message, conversationId: dto.conversationId, direction: 'OUTBOUND' },
        tenantId,
        userId,
      );
      await this.eventBus.publish(messageEvent);
    } catch (error: any) {
      this.logger.warn(`Failed to publish message.created event: ${error.message}`);
    }

    try {
      const sentEvent = new MessageSentEvent(
        { ...message, conversationId: dto.conversationId },
        tenantId,
        userId,
      );
      await this.eventBus.publish(sentEvent);
    } catch (error: any) {
      this.logger.warn(`Failed to publish message.sent event: ${error.message}`);
    }

    return message;
  }

  async createConversation(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.conversation.create({
      data: {
        subject: dto.subject,
        channel: dto.channel || 'CHAT',
        status: 'active',
        priority: dto.priority || 'normal',
        tags: dto.tags || [],
        contactId: dto.contactId,
        dealId: dto.dealId,
        companyId: dto.companyId,
        lastMessageAt: new Date(),
        tenantId,
        userId,
      },
    });
  }

  async assignConversation(tenantId: string, id: string, userId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.conversationAssignment.create({
      data: { conversationId: id, userId, status: 'assigned', assignedAt: new Date() },
    });
    return prismaAny.conversation.update({
      where: { id },
      data: { assignedToId: userId, status: 'assigned' },
    });
  }

  async transferConversation(tenantId: string, id: string, targetUserId: string) {
    return this.assignConversation(tenantId, id, targetUserId);
  }

  async resolveConversation(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.conversation.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
  }

  async archiveConversation(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.conversation.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async reopenConversation(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.conversation.update({
      where: { id },
      data: { status: 'active', resolvedAt: null },
    });
  }

  async addNote(tenantId: string, id: string, userId: string, content: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.conversationNote.create({
      data: { conversationId: id, content, userId },
    });
  }

  // Channels
  async getChannels(tenantId: string) {
    return (this.prisma as any).channel.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async connectChannel(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const credentialsToStore = dto.credentials
      ? this.encryptionService.isAvailable()
        ? this.encryptionService.encryptObject(dto.credentials, Object.keys(dto.credentials))
        : dto.credentials
      : {};
    return prismaAny.channel.upsert({
      where: { type_tenantId: { type: dto.type, tenantId } },
      create: {
        type: dto.type,
        name: dto.name || dto.type,
        credentials: credentialsToStore,
        config: (dto.config as any) || {},
        webhookSecret: dto.webhookSecret
          ? this.encryptionService.isAvailable()
            ? this.encryptionService.encrypt(dto.webhookSecret)
            : dto.webhookSecret
          : undefined,
        isConnected: true,
        healthScore: 'healthy',
        tenantId,
      },
      update: {
        name: dto.name,
        credentials: credentialsToStore,
        config: dto.config as any,
        webhookSecret: dto.webhookSecret
          ? this.encryptionService.isAvailable()
            ? this.encryptionService.encrypt(dto.webhookSecret)
            : dto.webhookSecret
          : undefined,
        isActive: true,
        isConnected: true,
      },
    });
  }

  async disconnectChannel(tenantId: string, channelId: string) {
    const prismaAny = this.prisma as any;
    const channel = await prismaAny.channel.findFirst({ where: { id: channelId, tenantId } });
    if (!channel) throw new Error('Channel not found');
    return prismaAny.channel.update({
      where: { id: channelId },
      data: { isActive: false, isConnected: false },
    });
  }

  // Queues
  async getQueues(tenantId: string) {
    return (this.prisma as any).conversationQueue.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQueue(tenantId: string, dto: any) {
    return (this.prisma as any).conversationQueue.create({
      data: {
        name: dto.name,
        description: dto.description,
        strategy: dto.strategy || 'round_robin',
        maxWaitTime: dto.maxWaitTime || 300,
        tenantId,
      },
    });
  }

  async deleteQueue(tenantId: string, id: string) {
    await (this.prisma as any).conversationQueue.deleteMany({ where: { id, tenantId } });
  }

  // Templates
  async getTemplates(tenantId: string, channel?: string) {
    const where: any = { tenantId, isActive: true };
    if (channel) where.channel = channel;
    return (this.prisma as any).messageTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createTemplate(tenantId: string, dto: any) {
    return (this.prisma as any).messageTemplate.create({
      data: {
        name: dto.name,
        content: dto.content,
        category: dto.category,
        channel: dto.channel,
        variables: (dto.variables as any) || {},
        tenantId,
      },
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    await (this.prisma as any).messageTemplate.deleteMany({ where: { id, tenantId } });
  }

  // Stats
  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [active, messagesToday, channels, queues, onlineAgents] = await Promise.all([
      prismaAny.conversation.count({
        where: { tenantId, status: { in: ['active', 'assigned', 'waiting'] } },
      }),
      prismaAny.message.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prismaAny.channel.count({ where: { tenantId, isActive: true } }),
      prismaAny.conversationQueue.count({ where: { tenantId, isActive: true } }),
      prismaAny.user.count({
        where: { tenantId, status: 'ACTIVE', sessions: { some: { expiresAt: { gt: new Date() } } } },
      }),
    ]);

    return {
      activeConversations: active,
      messagesToday,
      channels,
      queues,
      onlineAgents,
    };
  }
}
