import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;
    const portalUser = await prismaAny.customerPortalUser.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (portalUser) return portalUser;

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

  async updateProfile(
    tenantId: string,
    userId: string,
    dto: { firstName?: string; lastName?: string; phone?: string; title?: string },
  ) {
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.phone) data.phone = dto.phone;

    const portalUser = await prismaAny.customerPortalUser.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (portalUser) {
      return prismaAny.customerPortalUser.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          phone: true,
        },
      });
    }

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
        include: { ticketComment: { take: 1, orderBy: { createdAt: 'desc' } } },
      }) || [],
      prismaAny.ticket?.count({ where }) || 0,
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

  async getPortalDocuments(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.document?.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }) ||
        [],
      prismaAny.document?.count({ where }) || 0,
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

  async getPortalContracts(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.contract?.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }) || [],
      prismaAny.contract?.count({ where }) || 0,
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

  async getPortalQuotes(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.quote?.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }) || [],
      prismaAny.quote?.count({ where }) || 0,
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

  async getPortalConversations(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      prismaAny.conversation?.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        select: {
          id: true,
          subject: true,
          status: true,
          channel: true,
          lastMessageAt: true,
          lastMessagePreview: true,
        },
      }) || [],
      prismaAny.conversation?.count({ where }) || 0,
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

  async markNotificationRead(tenantId: string, userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllNotificationsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
