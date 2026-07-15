import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { AnalyticsFilterDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly prismaAny: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    this.prismaAny = this.prisma as any;
  }

  async getKPIs(tenantId: string, filter: AnalyticsFilterDto) {
    const { start, end } = this.resolveDateRange(filter);

    const [
      leadsCreated,
      leadsConverted,
      dealsWon,
      dealsLost,
      dealsOpen,
      totalRevenue,
      avgDealValue,
      activitiesCompleted,
      contractsActive,
      contractsExpiring,
      quotesSent,
      quotesAccepted,
      activeUsers,
      workflowExecutions,
      automationExecutions,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: start, lte: end } } }),
      this.prisma.lead.count({ where: { tenantId, convertedAt: { gte: start, lte: end } } }),
      this.prisma.deal.count({
        where: { tenantId, status: 'WON', updatedAt: { gte: start, lte: end } },
      }),
      this.prisma.deal.count({
        where: { tenantId, status: 'LOST', updatedAt: { gte: start, lte: end } },
      }),
      this.prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.deal.aggregate({
        where: { tenantId, status: 'WON', updatedAt: { gte: start, lte: end } },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { tenantId, status: 'WON', updatedAt: { gte: start, lte: end } },
        _avg: { value: true },
      }),
      this.prismaAny.activity?.count({
        where: { tenantId, completedAt: { gte: start, lte: end } },
      }) || 0,
      this.prismaAny.contract?.count({ where: { tenantId, status: 'ACTIVE' } }) || 0,
      this.prismaAny.contract?.count({ where: { tenantId, status: 'EXPIRING' } }) || 0,
      this.prismaAny.quote?.count({ where: { tenantId, createdAt: { gte: start, lte: end } } }) ||
        0,
      this.prismaAny.quote?.count({
        where: { tenantId, status: 'ACCEPTED', updatedAt: { gte: start, lte: end } },
      }) || 0,
      this.prisma.user.count({ where: { tenantId } as any }),
      this.prismaAny.workflowExecution?.count({
        where: { tenantId, createdAt: { gte: start, lte: end } },
      }) || 0,
      this.prismaAny.automationExecution?.count({
        where: { tenantId, createdAt: { gte: start, lte: end } },
      }) || 0,
    ]);

    const conversionRate = leadsCreated > 0 ? (leadsConverted / leadsCreated) * 100 : 0;
    const winRate = dealsWon + dealsLost > 0 ? (dealsWon / (dealsWon + dealsLost)) * 100 : 0;

    return {
      leadsCreated,
      leadsConverted,
      conversionRate: Math.round(conversionRate * 100) / 100,
      dealsWon,
      dealsLost,
      dealsOpen,
      winRate: Math.round(winRate * 100) / 100,
      totalRevenue: totalRevenue._sum?.value || 0,
      avgDealValue: avgDealValue._avg?.value || 0,
      activitiesCompleted,
      contractsActive,
      contractsExpiring,
      quotesSent,
      quotesAccepted,
      activeUsers,
      workflowExecutions,
      automationExecutions,
      period: { start, end },
    };
  }

  async getFunnel(tenantId: string, filter: AnalyticsFilterDto) {
    const { start, end } = this.resolveDateRange(filter);
    const pipelineId = filter.pipelineId;

    const whereBase: any = { tenantId, deletedAt: null };
    if (pipelineId) whereBase.pipelineId = pipelineId;

    const [leadsTotal, leadsQualified, dealsCreated, dealsWon] = await Promise.all([
      this.prisma.lead.count({ where: { ...whereBase, createdAt: { gte: start, lte: end } } }),
      this.prisma.lead.count({
        where: { ...whereBase, status: 'QUALIFIED', updatedAt: { gte: start, lte: end } },
      }),
      this.prisma.deal.count({ where: { ...whereBase, createdAt: { gte: start, lte: end } } }),
      this.prisma.deal.count({
        where: { ...whereBase, status: 'WON', updatedAt: { gte: start, lte: end } },
      }),
    ]);

    return {
      stages: [
        { label: 'Leads', value: leadsTotal },
        { label: 'Qualificados', value: leadsQualified },
        { label: 'Negócios', value: dealsCreated },
        { label: 'Ganhos', value: dealsWon },
      ],
    };
  }

  async getRevenueByPeriod(tenantId: string, filter: AnalyticsFilterDto) {
    const { start, end } = this.resolveDateRange(filter);

    const deals = await this.prisma.deal.findMany({
      where: { tenantId, status: 'WON', updatedAt: { gte: start, lte: end } },
      select: { value: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const d of deals) {
      const key = d.updatedAt.toISOString().slice(0, 10);
      grouped.set(key, (grouped.get(key) || 0) + (Number(d.value) || 0));
    }

    return Array.from(grouped.entries()).map(([date, value]) => ({ date, value }));
  }

  async getDealsByStage(tenantId: string, _filter: AnalyticsFilterDto) {
    const deals = await this.prisma.deal.findMany({
      where: { tenantId, deletedAt: null },
      include: { stage: { select: { name: true } } },
    });

    const grouped = new Map<string, { count: number; value: number }>();
    for (const d of deals) {
      const stage = (d as any).stage?.name || 'Unknown';
      const curr = grouped.get(stage) || { count: 0, value: 0 };
      grouped.set(stage, { count: curr.count + 1, value: curr.value + (Number(d.value) || 0) });
    }

    return Array.from(grouped.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
    }));
  }

  async getDealsByOwner(tenantId: string, filter: AnalyticsFilterDto) {
    const { start, end } = this.resolveDateRange(filter);

    const deals = await this.prisma.deal.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });

    const grouped = new Map<string, { wins: number; lost: number; total: number }>();
    for (const d of deals) {
      const owner = (d as any).owner;
      const name = owner ? `${owner.firstName} ${owner.lastName}` : 'Unassigned';
      const curr = grouped.get(name) || { wins: 0, lost: 0, total: 0 };
      curr.total++;
      if (d.status === 'WON') curr.wins++;
      if (d.status === 'LOST') curr.lost++;
      grouped.set(name, curr);
    }

    return Array.from(grouped.entries()).map(([owner, data]) => ({
      owner,
      dealsWon: data.wins,
      dealsLost: data.lost,
      dealsTotal: data.total,
    }));
  }

  async getLeadsBySource(tenantId: string, filter: AnalyticsFilterDto) {
    const { start, end } = this.resolveDateRange(filter);

    const leads = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { tenantId, createdAt: { gte: start, lte: end } },
      _count: true,
    });

    return leads.map((l) => ({ source: l.source || 'Unknown', count: l._count }));
  }

  // Dashboard CRUD
  async getDashboards(tenantId: string, userId?: string) {
    return this.prismaAny.dashboard.findMany({
      where: {
        tenantId,
        OR: [{ userId }, { isDefault: true }],
      },
      include: { widgets: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboard(tenantId: string, id: string) {
    return this.prismaAny.dashboard.findFirst({
      where: { id, tenantId },
      include: { widgets: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async createDashboard(tenantId: string, userId: string, dto: any) {
    return this.prismaAny.dashboard.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category || 'USER',
        isDefault: dto.isDefault || false,
        isTemplate: dto.isTemplate || false,
        config: (dto.config as any) || {},
        tenantId,
        userId,
      },
      include: { widgets: true },
    });
  }

  async updateDashboard(tenantId: string, id: string, dto: any) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.config !== undefined) data.config = dto.config as any;

    if (dto.widgets !== undefined) {
      await this.prismaAny.widget.deleteMany({ where: { dashboardId: id } });
      if (dto.widgets.length > 0) {
        await this.prismaAny.widget.createMany({
          data: dto.widgets.map((w: any) => ({
            dashboardId: id,
            name: w.name,
            type: w.type,
            config: (w.config as any) || {},
            position: (w.position as any) || { x: 0, y: 0, w: 4, h: 3 },
            refreshInterval: w.refreshInterval,
            tenantId,
          })),
        });
      }
    }

    return this.prismaAny.dashboard.update({
      where: { id },
      data,
      include: { widgets: true },
    });
  }

  async deleteDashboard(tenantId: string, id: string) {
    await this.prismaAny.widget.deleteMany({ where: { dashboardId: id } });
    await this.prismaAny.dashboard.deleteMany({ where: { id, tenantId } });
  }

  async getTemplates(tenantId: string) {
    return this.prismaAny.dashboardTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveTemplate(tenantId: string, userId: string, dto: any) {
    return this.prismaAny.dashboardTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category || 'USER',
        config: (dto.config as any) || {},
        widgets: (dto.widgets as any) || [],
        tenantId,
        createdBy: userId,
      },
    });
  }

  async recalculate(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const metrics = [
      {
        key: 'leads_today',
        type: 'COUNT' as const,
        name: 'Leads Hoje',
        fn: () => this.prisma.lead.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      },
      {
        key: 'deals_won_week',
        type: 'COUNT' as const,
        name: 'Deals Ganhos (Semana)',
        fn: () =>
          this.prisma.deal.count({
            where: { tenantId, status: 'WON', updatedAt: { gte: weekAgo } },
          }),
      },
      {
        key: 'revenue_month',
        type: 'SUM' as const,
        name: 'Receita (Mês)',
        fn: async () => {
          const r = await this.prisma.deal.aggregate({
            where: { tenantId, status: 'WON', updatedAt: { gte: monthStart } },
            _sum: { value: true },
          });
          return r._sum.value || 0;
        },
      },
      {
        key: 'active_deals',
        type: 'COUNT' as const,
        name: 'Negócios Ativos',
        fn: () => this.prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      },
    ];

    const snapshots = [];
    for (const m of metrics) {
      snapshots.push({
        metricKey: m.key,
        metricType: m.type,
        metricName: m.name,
        value: await m.fn(),
        period: 'daily',
        periodStart: todayStart,
        tenantId,
      });
    }

    await this.prismaAny.metricSnapshot.createMany({ data: snapshots });
    return { recalculated: snapshots.length };
  }

  async collectEvent(event: any) {
    try {
      await this.prismaAny.analyticsEvent.create({
        data: {
          eventName: event.eventName,
          entityType: event.aggregateType,
          entityId: event.aggregateId,
          payload: event.payload as any,
          metadata: event.metadata as any,
          tenantId: event.tenantId,
          userId: event.userId,
          correlationId: event.correlationId,
        },
      });
    } catch (error: any) {
      this.logger.warn(`Failed to collect event: ${error.message}`);
    }
  }

  async getEvents(tenantId: string, eventName?: string, page = 1, limit = 30) {
    const where: any = { tenantId };
    if (eventName) where.eventName = eventName;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prismaAny.analyticsEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaAny.analyticsEvent.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [eventsToday, eventsMonth, dashboardsTotal, widgetsTotal] = await Promise.all([
      this.prismaAny.analyticsEvent.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prismaAny.analyticsEvent.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
      this.prismaAny.dashboard.count({ where: { tenantId } }),
      this.prismaAny.widget.count({ where: { tenantId, isEnabled: true } }),
    ]);

    return { eventsToday, eventsMonth, dashboardsTotal, widgetsTotal };
  }

  private resolveDateRange(filter: AnalyticsFilterDto): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter.startDate && filter.endDate) {
      return { start: new Date(filter.startDate), end: new Date(filter.endDate) };
    }

    switch (filter.period) {
      case 'today':
        return { start: today, end: now };
      case 'yesterday':
        return { start: new Date(today.getTime() - 86400000), end: today };
      case 'last_7_days':
        return { start: new Date(today.getTime() - 7 * 86400000), end: now };
      case 'this_week': {
        const day = today.getDay();
        const monday = new Date(today.getTime() - (day === 0 ? 6 : day - 1) * 86400000);
        return { start: monday, end: now };
      }
      case 'this_month':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case 'this_quarter':
        return {
          start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
          end: now,
        };
      case 'this_year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default:
        return { start: new Date(today.getTime() - 30 * 86400000), end: now };
    }
  }
}
