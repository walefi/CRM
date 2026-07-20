import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaces(tenantId: string) {
    return (this.prisma as any).workspace.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, include: { members: true, _count: { select: { members: true } } } });
  }

  async createWorkspace(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const workspace = await prismaAny.workspace.create({
      data: { name: dto.name, description: dto.description, type: dto.type || 'team', metadata: (dto.metadata as any) || {}, tenantId, createdBy: userId },
    });
    if (userId) {
      await prismaAny.workspaceMember.create({ data: { workspaceId: workspace.id, userId, role: 'admin' } });
    }
    return workspace;
  }

  async getAnnouncements(tenantId: string) {
    return (this.prisma as any).announcement.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  async createAnnouncement(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).announcement.create({
      data: { title: dto.title, content: dto.content, priority: dto.priority || 'normal', workspaceId: dto.workspaceId, pinnedUntil: dto.pinnedUntil ? new Date(dto.pinnedUntil) : undefined, tenantId, createdBy: userId },
    });
  }

  async getMeetings(tenantId: string) {
    return (this.prisma as any).meeting.findMany({ where: { tenantId }, orderBy: { startAt: 'asc' }, include: { participants: true } });
  }

  async createMeeting(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).meeting.create({
      data: {
        title: dto.title, description: dto.description, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt),
        room: dto.room, link: dto.link, organizerId: userId, notes: dto.notes, tenantId, createdBy: userId,
        participants: dto.participants?.length ? { create: dto.participants.map((p: any) => ({ userId: p.userId, email: p.email, name: p.name })) } : undefined,
      },
      include: { participants: true },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [workspaces, announcements, meetings, conversations] = await Promise.all([
      prismaAny.workspace.count({ where: { tenantId } }),
      prismaAny.announcement.count({ where: { tenantId } }),
      prismaAny.meeting.count({ where: { tenantId } }),
      prismaAny.conversation?.count({ where: { tenantId, status: 'active' } }) || 0,
    ]);
    return { workspaces, announcements, scheduledMeetings: meetings, activeConversations: conversations };
  }
}
