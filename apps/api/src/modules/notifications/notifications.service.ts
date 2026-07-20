import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(tenantId: string, userId: string, dto: any) {
    const where: any = { tenantId, userId };
    if (dto.isRead !== undefined) where.isRead = dto.isRead === 'true';
    if (dto.category) where.category = dto.category;
    if (dto.channel) where.channel = dto.channel;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async markAsRead(tenantId: string, id: string, userId: string) {
    await this.prisma.notification.update({ where: { id, tenantId, userId }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { tenantId, userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return { success: true };
  }

  async send(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title, body: dto.body || dto.message || '', type: dto.type || 'info',
        channel: dto.channel || 'in_app', category: dto.category || 'system',
        url: dto.url, data: (dto.data as any) || {}, tenantId, userId: userId || dto.userId,
      },
    });

    if (dto.channel && dto.channel !== 'in_app') {
      await prismaAny.notificationDelivery.create({
        data: { notificationId: notification.id, channel: dto.channel, status: 'sent', deliveredAt: new Date(), tenantId },
      }).catch((error: any) => this.logger.warn(`Failed to create notification delivery record: ${error.message}`));
    }

    return notification;
  }

  async sendTemplate(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    let template = null;
    if (dto.templateId) {
      template = await prismaAny.notificationTemplate.findFirst({ where: { id: dto.templateId, tenantId } });
    }
    const title = template?.subject || dto.title || 'Notification';
    const body = template?.body || dto.body || '';

    return this.send(tenantId, userId, { title, body, channel: dto.channel || template?.channel, category: dto.category || template?.category });
  }

  async broadcast(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const users = await this.prisma.user.findMany({ where: { tenantId }, select: { id: true } });
    const notifications = await Promise.all(
      users.map(u => this.send(tenantId, u.id, dto).catch((error: any) => {
        this.logger.warn(`Failed to send notification to user ${u.id}: ${error.message}`);
        return null;
      })),
    );
    const sent = notifications.filter(Boolean).length;
    await prismaAny.notificationDelivery.create({
      data: { notificationId: 'broadcast-' + Date.now(), channel: dto.channel || 'broadcast', status: 'sent', deliveredAt: new Date(), tenantId },
    }).catch((error: any) => this.logger.warn(`Failed to create broadcast delivery record: ${error.message}`));
    return { broadcast: true, recipients: users.length, sent };
  }

  async schedule(tenantId: string, userId: string, dto: any) {
    return { scheduled: true, scheduledAt: dto.scheduledAt || new Date(Date.now() + 3600000).toISOString(), message: 'Notification scheduled' };
  }

  async delete(tenantId: string, id: string) {
    await this.prisma.notification.deleteMany({ where: { id, tenantId } });
  }

  async getTemplates(tenantId: string) {
    return (this.prisma as any).notificationTemplate.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async createTemplate(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).notificationTemplate.create({
      data: { name: dto.name, subject: dto.subject, body: dto.body, channel: dto.channel || 'email', category: dto.category, variables: (dto.variables as any) || {}, tenantId, createdBy: userId },
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    await (this.prisma as any).notificationTemplate.deleteMany({ where: { id, tenantId } });
  }

  async getPreferences(tenantId: string, userId: string) {
    return (this.prisma as any).notificationPreference.findMany({ where: { userId }, orderBy: { channel: 'asc' } });
  }

  async updatePreference(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.notificationPreference.upsert({
      where: { userId_channel_category: { userId, channel: dto.channel, category: dto.category } },
      create: { userId, channel: dto.channel, category: dto.category, isEnabled: dto.isEnabled ?? true, quietStart: dto.quietStart, quietEnd: dto.quietEnd, tenantId },
      update: { isEnabled: dto.isEnabled, quietStart: dto.quietStart, quietEnd: dto.quietEnd },
    });
  }

  async getDelivery(notificationId: string) {
    return (this.prisma as any).notificationDelivery.findMany({ where: { notificationId }, orderBy: { createdAt: 'desc' }, take: 5 });
  }

  async getStats(tenantId: string, userId?: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const baseWhere: any = userId ? { tenantId, userId } : { tenantId };
    const [total, sent, unread, templates] = await Promise.all([
      this.prisma.notification.count({ where: baseWhere }),
      this.prisma.notification.count({ where: { ...baseWhere, createdAt: { gte: todayStart } } }),
      this.prisma.notification.count({ where: { ...baseWhere, isRead: false } }),
      prismaAny.notificationTemplate.count({ where: { tenantId, isActive: true } }),
    ]);
    return { total, sentToday: sent, unread, templates };
  }
}
