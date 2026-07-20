import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;

    const portalUser = await prismaAny.customerPortalUser.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { customerId: true },
    });

    const customerId = portalUser?.customerId;

    const [
      openTickets,
      activeConversations,
      pendingQuotes,
      activeContracts,
      unreadNotifications,
      recentActivities,
    ] = await Promise.all([
      prismaAny.ticket?.count({
        where: { tenantId, status: { in: ['new', 'open', 'in_progress'] } },
      }) || 0,
      prismaAny.conversation?.count({
        where: { tenantId, status: { in: ['active', 'assigned'] } },
      }) || 0,
      customerId
        ? prismaAny.quote?.count({
            where: { tenantId, customerId, status: { in: ['draft', 'sent', 'viewed'] } },
          }) || 0
        : 0,
      customerId
        ? prismaAny.contract?.count({
            where: { tenantId, customerId, status: { in: ['active', 'pending_signature'] } },
          }) || 0
        : 0,
      prismaAny.notification.count({ where: { userId, isRead: false } }),
      prismaAny.timeline?.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, summary: true, module: true, action: true, createdAt: true },
      }) || [],
    ]);

    const recentTickets =
      (await prismaAny.ticket?.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, subject: true, status: true, priority: true, updatedAt: true },
      })) || [];

    const expiringContracts =
      (customerId
        ? await prismaAny.contract?.findMany({
            where: {
              tenantId,
              customerId,
              status: 'active',
              endDate: { lte: new Date(Date.now() + 30 * 86400000) },
            },
            take: 5,
            orderBy: { endDate: 'asc' },
            select: { id: true, number: true, title: true, endDate: true },
          })
        : []) || [];

    return {
      stats: {
        openTickets,
        activeConversations,
        pendingQuotes,
        activeContracts,
        unreadNotifications,
      },
      recentTickets,
      expiringContracts,
      recentActivities,
    };
  }
}
