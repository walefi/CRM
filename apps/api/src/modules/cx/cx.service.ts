import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CxService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.channel) where.channel = dto.channel;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.conversation.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } } }),
      prismaAny.conversation.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getChannels(tenantId: string) {
    return (this.prisma as any).channel.findMany({ where: { tenantId }, orderBy: { type: 'asc' } });
  }

  async connectChannel(tenantId: string, dto: any) {
    return (this.prisma as any).channel.upsert({
      where: { type_tenantId: { type: dto.type, tenantId } },
      create: { type: dto.type, name: dto.name || dto.type, isConnected: true, isActive: true, tenantId },
      update: { name: dto.name, isActive: true, isConnected: true },
    });
  }

  async getQueues(tenantId: string) {
    return (this.prisma as any).conversationQueue.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async getAgents(tenantId: string) {
    return (this.prisma as any).agent.findMany({ where: { tenantId }, orderBy: { status: 'asc' } });
  }

  async setAgentStatus(tenantId: string, userId: string, status: string) {
    return (this.prisma as any).agent.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: { userId, status, skills: [], tenantId, lastActiveAt: new Date() },
      update: { status, lastActiveAt: new Date() },
    });
  }

  async getJourneys(tenantId: string) {
    return (this.prisma as any).customerJourney.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 20 });
  }

  async getSLA(tenantId: string) {
    return (this.prisma as any).sLAPolicy.findMany({ where: { tenantId }, orderBy: { priority: 'asc' } });
  }

  async createSLA(tenantId: string, dto: any) {
    return (this.prisma as any).sLAPolicy.create({
      data: { name: dto.name, priority: dto.priority || 'normal', firstResponse: dto.firstResponse || 300, resolution: dto.resolution || 3600, escalationAfter: dto.escalationAfter || 600, escalationLevel: dto.escalationLevel || 3, tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [conversations, channels, agents, slaViolations] = await Promise.all([
      prismaAny.conversation.count({ where: { tenantId, status: 'active' } }),
      prismaAny.channel.count({ where: { tenantId, isConnected: true } }),
      prismaAny.agent.count({ where: { tenantId, status: 'online' } }),
      prismaAny.conversation.count({ where: { tenantId, slaStatus: 'breached' } }),
    ]);
    return { activeConversations: conversations, connectedChannels: channels, onlineAgents: agents, slaViolations };
  }
}
