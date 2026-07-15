import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;
    const [tickets, conversations, documents, contracts, quotes, notifications] = await Promise.all(
      [
        prismaAny.ticket?.count({
          where: { tenantId, status: { in: ['new', 'open', 'in_progress'] } },
        }) || 0,
        prismaAny.conversation?.count({
          where: { tenantId, status: { in: ['active', 'assigned'] } },
        }) || 0,
        prismaAny.document?.count({ where: { tenantId, createdBy: userId } }) || 0,
        prismaAny.contract?.count({ where: { tenantId } }) || 0,
        prismaAny.quote?.count({ where: { tenantId } }) || 0,
        this.prisma.notification.count({ where: { userId, isRead: false } }),
      ],
    );

    const recentTickets =
      (await prismaAny.ticket?.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, subject: true, status: true, priority: true, updatedAt: true },
      })) || [];

    return {
      tickets,
      conversations,
      documents,
      contracts,
      quotes,
      unreadNotifications: notifications,
      recentTickets,
    };
  }

  async getProfile(tenantId: string, userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        title: true,
      },
    });
  }

  async updateProfile(tenantId: string, userId: string, dto: any) {
    const data: any = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.phone) data.phone = dto.phone;
    if (dto.title) data.title = dto.title;
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        title: true,
      },
    });
  }

  async getPortalTickets(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      prismaAny.ticket?.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { comments: { take: 1, orderBy: { createdAt: 'desc' } } },
      }) || [],
      prismaAny.ticket?.count({ where }) || 0,
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPortalDocuments(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.document?.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }) ||
        [],
      prismaAny.document?.count({ where }) || 0,
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPortalContracts(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.contract?.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }) ||
        [],
      prismaAny.contract?.count({ where }) || 0,
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPortalQuotes(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.quote?.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }) || [],
      prismaAny.quote?.count({ where }) || 0,
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getNotifications(tenantId: string, userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
